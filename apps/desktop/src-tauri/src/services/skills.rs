use log::{debug, info, warn};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::agent::registry::{get_agent, AgentRegistryEntry};
use crate::commands::skills::{
    AgentBindingOverride, AgentInstallRecord, ResolvedSkill, Skill, SkillDetail, Source,
    UpdateCheckResult,
};
use crate::error::CommandError;
use crate::git::utils::compute_content_hash;
use crate::lock::global::{
    load_global_lock, save_global_lock, GlobalSkillEntry, LockInstallRecord, LockSource,
};
use crate::provider::github::GitHubProvider;
use crate::provider::local_provider::LocalProvider;
use crate::provider::traits::HostProvider;
use crate::skill_parser::{read_skill_md, SkillMetadata};
use crate::source::parser::{parse_source, ParsedSource};

/// The central engine for skill lifecycle operations.
///
/// Orchestrates install, remove, update, list, and update-check workflows
/// using providers, the lock manager, and the skill parser.
pub struct SkillEngine {
    providers: Vec<Box<dyn HostProvider>>,
}

impl SkillEngine {
    /// Create a new SkillEngine with the default set of providers.
    pub fn new() -> Self {
        let providers: Vec<Box<dyn HostProvider>> = vec![
            Box::new(GitHubProvider::new()),
            Box::new(LocalProvider::new()),
        ];
        Self { providers }
    }

    /// Find the first provider that can handle the given parsed source.
    fn find_provider(&self, parsed: &ParsedSource) -> Option<&dyn HostProvider> {
        self.providers
            .iter()
            .find(|p| p.can_handle(parsed))
            .map(|p| p.as_ref())
    }

    /// Get the base directory for canonical skill storage.
    fn get_skills_base_dir() -> PathBuf {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let dir = home.join(".agents").join("skills");
        if !dir.exists() {
            let _ = std::fs::create_dir_all(&dir);
        }
        dir
    }

    /// Build a canonical directory name for a skill from its source info.
    fn build_canonical_dir_name(parsed: &ParsedSource, content_hash: &str) -> String {
        let hash_prefix = &content_hash[..8.min(content_hash.len())];
        let provider = &parsed.source_type;
        let owner = parsed.owner.as_deref().unwrap_or("local");
        let repo = parsed.repo.as_deref().unwrap_or("skill");
        format!("{}-{}-{}-{}", provider, owner, repo, hash_prefix)
    }

    /// Install a skill from a source string to one or more agents.
    pub async fn install_skill(
        &self,
        source_str: &str,
        agents: &[String],
        mode: &str,
        scope: &str,
        force: bool,
        agent_bindings: Option<&HashMap<String, AgentBindingOverride>>,
    ) -> Result<Skill, CommandError> {
        // 1. Parse source
        let parsed = parse_source(source_str);
        info!("Parsed source: {:?}", parsed);

        // 2. Find provider
        let provider = self.find_provider(&parsed).ok_or_else(|| {
            CommandError::ProviderError(format!(
                "No provider available for source type: {}",
                parsed.source_type
            ))
        })?;

        // 3. Resolve skill (get list of skills at source)
        let resolved_list = provider.resolve(&parsed).await?;
        if resolved_list.is_empty() {
            return Err(CommandError::InvalidSkill(
                "No skills found at source".to_string(),
            ));
        }

        // Use the first resolved skill (or the one matching skill_name filter)
        let resolved = &resolved_list[0];
        info!(
            "Resolved skill: {} from {}",
            resolved.name, resolved.source_url
        );

        // 4. Check if already exists in lock (unless force=true)
        let mut global_lock = load_global_lock();
        if !force {
            if global_lock.skills.contains_key(&resolved.name) {
                return Err(CommandError::SkillExists(resolved.name.clone()));
            }
        }

        // 5. Fetch to canonical path
        let skills_base = Self::get_skills_base_dir();

        // Create a temporary canonical dir name (will rename after hashing)
        let temp_dir = skills_base.join(format!("_temp_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir)?;

        provider.fetch(resolved, &temp_dir).await.map_err(|e| {
            // Clean up temp dir on failure
            let _ = std::fs::remove_dir_all(&temp_dir);
            e
        })?;

        // Compute content hash from fetched content
        let content_hash = compute_content_hash(&temp_dir).map_err(|e| {
            let _ = std::fs::remove_dir_all(&temp_dir);
            CommandError::InternalError(format!("Failed to compute content hash: {}", e))
        })?;

        // Rename temp dir to canonical dir
        let canonical_dir_name = Self::build_canonical_dir_name(&parsed, &content_hash);
        let canonical_path = skills_base.join(&canonical_dir_name);

        // If canonical path already exists and force is true, remove it first
        if canonical_path.exists() {
            if force {
                std::fs::remove_dir_all(&canonical_path)?;
            } else {
                // Clean up temp and use existing
                let _ = std::fs::remove_dir_all(&temp_dir);
            }
        }

        if !canonical_path.exists() {
            std::fs::rename(&temp_dir, &canonical_path).map_err(|e| {
                let _ = std::fs::remove_dir_all(&temp_dir);
                CommandError::IoError(e)
            })?;
        }

        // 6. Parse SKILL.md from fetched content
        let metadata = read_skill_md(&canonical_path).unwrap_or_else(|_| {
            debug!("No SKILL.md found, using defaults");
            SkillMetadata {
                name: Some(resolved.name.clone()),
                description: resolved.description.clone(),
                ..Default::default()
            }
        });

        let skill_name = metadata
            .name
            .clone()
            .unwrap_or_else(|| resolved.name.clone());

        // 7. Install to each target agent (create symlinks or copies)
        // If any selected agent is universal, automatically include all installed universal agents
        let now = chrono::Utc::now().to_rfc3339();
        let mut installs = Vec::new();

        // Expand agents list to include all universal agents if any universal agent is selected
        let mut expanded_agents: Vec<String> = agents.to_vec();
        let has_universal = agents.iter().any(|a| {
            use crate::agent::registry::is_universal_agent;
            is_universal_agent(a)
        });

        if has_universal {
            // Get all universal agents and add them if not already in the list
            use crate::agent::detect::is_agent_installed;
            use crate::agent::registry::{get_all_agents, get_universal_agents};

            let universal_agents = get_universal_agents();
            let all_agents = get_all_agents();

            for ua in universal_agents {
                // Check if this universal agent is installed
                if let Some(agent_entry) = all_agents.iter().find(|a| a.agent_type == ua) {
                    if is_agent_installed(agent_entry) && !expanded_agents.contains(&ua) {
                        expanded_agents.push(ua);
                    }
                }
            }

            info!("Expanded universal agents: {:?}", expanded_agents);
        }

        for agent_name in &expanded_agents {
            let agent_entry = get_agent(agent_name)
                .ok_or_else(|| CommandError::AgentNotFound(agent_name.clone()))?;

            // Determine mode and scope for this agent, considering overrides
            let (agent_mode, agent_scope) = if let Some(bindings) = agent_bindings {
                if let Some(binding) = bindings.get(agent_name) {
                    (
                        binding.mode.as_deref().unwrap_or(mode),
                        binding.scope.as_deref().unwrap_or(scope),
                    )
                } else {
                    (mode, scope)
                }
            } else {
                (mode, scope)
            };

            let installed_path = install_to_agent(
                &agent_entry,
                &canonical_path,
                &skill_name,
                agent_mode,
                agent_scope,
            )?;

            installs.push(AgentInstallRecord {
                agent: agent_name.clone(),
                scope: agent_scope.to_string(),
                mode: agent_mode.to_string(),
                installed_path: installed_path.clone(),
                installed_at: now.clone(),
            });
        }

        // 8. Update global lock file
        let lock_source = LockSource {
            source_type: parsed.source_type.clone(),
            url: parsed.url.clone(),
            subpath: parsed.subpath.clone(),
            git_ref: parsed.git_ref.clone(),
            provider: Some(provider.name().to_string()),
        };

        let lock_installs: Vec<LockInstallRecord> = installs
            .iter()
            .map(|i| LockInstallRecord {
                agent: i.agent.clone(),
                scope: i.scope.clone(),
                mode: i.mode.clone(),
                installed_path: i.installed_path.clone(),
                installed_at: i.installed_at.clone(),
            })
            .collect();

        let lock_entry = GlobalSkillEntry {
            source: lock_source,
            canonical_path: canonical_path.to_string_lossy().to_string(),
            description: metadata.description.clone(),
            version: metadata.version.clone(),
            author: metadata.author.clone(),
            tags: metadata.tags.clone(),
            tree_sha: None,
            content_hash: content_hash.clone(),
            installs: lock_installs,
            updated_at: now.clone(),
        };

        global_lock.skills.insert(skill_name.clone(), lock_entry);
        save_global_lock(&global_lock)?;

        // 9. Return Skill struct
        let source = Source {
            source_type: parsed.source_type.clone(),
            url: parsed.url.clone(),
            subpath: parsed.subpath.clone(),
            git_ref: parsed.git_ref.clone(),
            provider: Some(provider.name().to_string()),
        };

        Ok(Skill {
            id: uuid::Uuid::new_v4().to_string(),
            name: skill_name,
            description: metadata.description.unwrap_or_default(),
            source,
            canonical_path: canonical_path.to_string_lossy().to_string(),
            version: metadata.version,
            author: metadata.author,
            tags: metadata.tags,
            installs,
            updated_at: now,
            tree_sha: None,
            content_hash,
        })
    }

    /// Remove a skill from specified agents (or all agents).
    pub async fn remove_skill(
        &self,
        name: &str,
        agents: Option<&[String]>,
        clean_cache: bool,
    ) -> Result<(), CommandError> {
        let mut global_lock = load_global_lock();

        let entry = global_lock
            .skills
            .get(name)
            .ok_or_else(|| CommandError::SkillNotFound(name.to_string()))?
            .clone();

        // Determine which agents to remove from
        let agents_to_remove: Vec<String> = match agents {
            Some(agent_list) => agent_list.to_vec(),
            None => entry.installs.iter().map(|i| i.agent.clone()).collect(),
        };

        // Remove symlinks/copies from agent dirs
        for install in &entry.installs {
            if agents_to_remove.contains(&install.agent) {
                let path = Path::new(&install.installed_path);
                if path.exists() {
                    if path.is_symlink() || path.is_file() {
                        let _ = std::fs::remove_file(path);
                    } else if path.is_dir() {
                        let _ = std::fs::remove_dir_all(path);
                    }
                    info!(
                        "Removed skill '{}' from agent '{}' at {}",
                        name, install.agent, install.installed_path
                    );
                }
            }
        }

        // Update lock file: remove installs for specified agents
        let remaining_installs: Vec<LockInstallRecord> = entry
            .installs
            .iter()
            .filter(|i| !agents_to_remove.contains(&i.agent))
            .cloned()
            .collect();

        if remaining_installs.is_empty() {
            // No installs left, remove entirely
            global_lock.skills.remove(name);

            // If clean_cache is true, also remove the canonical path
            if clean_cache {
                let canonical = Path::new(&entry.canonical_path);
                if canonical.exists() {
                    let _ = std::fs::remove_dir_all(canonical);
                    info!(
                        "Cleaned canonical path for '{}': {}",
                        name, entry.canonical_path
                    );
                }
            }
        } else {
            // Update with remaining installs
            if let Some(lock_entry) = global_lock.skills.get_mut(name) {
                lock_entry.installs = remaining_installs;
                lock_entry.updated_at = chrono::Utc::now().to_rfc3339();
            }
        }

        save_global_lock(&global_lock)?;
        Ok(())
    }

    /// Update a skill by re-fetching from its source and comparing content hashes.
    pub async fn update_skill(&self, name: &str) -> Result<Skill, CommandError> {
        let global_lock = load_global_lock();

        let entry = global_lock
            .skills
            .get(name)
            .ok_or_else(|| CommandError::SkillNotFound(name.to_string()))?
            .clone();

        // Parse the stored source back to a ParsedSource
        let parsed = parse_source(&entry.source.url);

        let provider = self.find_provider(&parsed).ok_or_else(|| {
            CommandError::ProviderError(format!(
                "No provider for source type: {}",
                entry.source.source_type
            ))
        })?;

        // Resolve and re-fetch
        let resolved_list = provider.resolve(&parsed).await?;
        let resolved = resolved_list.first().ok_or_else(|| {
            CommandError::InvalidSkill(format!("No skills found at source for '{}'", name))
        })?;

        // Fetch to a temp directory
        let skills_base = Self::get_skills_base_dir();
        let temp_dir = skills_base.join(format!("_temp_update_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir)?;

        provider.fetch(resolved, &temp_dir).await.map_err(|e| {
            let _ = std::fs::remove_dir_all(&temp_dir);
            e
        })?;

        // Compute new content hash
        let new_hash = compute_content_hash(&temp_dir).map_err(|e| {
            let _ = std::fs::remove_dir_all(&temp_dir);
            CommandError::InternalError(format!("Failed to compute content hash: {}", e))
        })?;

        if new_hash == entry.content_hash {
            // No changes
            let _ = std::fs::remove_dir_all(&temp_dir);
            info!("Skill '{}' is already up to date", name);

            return Ok(lock_entry_to_skill(name, &entry));
        }

        // Content has changed -- update canonical path
        let canonical_dir_name = Self::build_canonical_dir_name(&parsed, &new_hash);
        let new_canonical_path = skills_base.join(&canonical_dir_name);

        // Remove old canonical if it exists at a different path
        let old_canonical = Path::new(&entry.canonical_path);
        if old_canonical.exists() && old_canonical != new_canonical_path {
            let _ = std::fs::remove_dir_all(old_canonical);
        }

        if new_canonical_path.exists() {
            let _ = std::fs::remove_dir_all(&new_canonical_path);
        }
        std::fs::rename(&temp_dir, &new_canonical_path).map_err(|e| {
            let _ = std::fs::remove_dir_all(&temp_dir);
            CommandError::IoError(e)
        })?;

        // Parse updated SKILL.md
        let metadata = read_skill_md(&new_canonical_path).unwrap_or_else(|_| SkillMetadata {
            name: Some(name.to_string()),
            ..Default::default()
        });

        // Re-create symlinks for all existing agent installs
        let now = chrono::Utc::now().to_rfc3339();
        let mut new_installs = Vec::new();

        for old_install in &entry.installs {
            let agent_entry = match get_agent(&old_install.agent) {
                Some(e) => e,
                None => {
                    warn!(
                        "Agent '{}' not found in registry during update, skipping",
                        old_install.agent
                    );
                    continue;
                }
            };

            // Remove old symlink/copy
            let old_path = Path::new(&old_install.installed_path);
            if old_path.exists() {
                if old_path.is_symlink() || old_path.is_file() {
                    let _ = std::fs::remove_file(old_path);
                } else if old_path.is_dir() {
                    let _ = std::fs::remove_dir_all(old_path);
                }
            }

            // Re-install to the agent
            let installed_path = install_to_agent(
                &agent_entry,
                &new_canonical_path,
                name,
                &old_install.mode,
                &old_install.scope,
            )?;

            new_installs.push(LockInstallRecord {
                agent: old_install.agent.clone(),
                scope: old_install.scope.clone(),
                mode: old_install.mode.clone(),
                installed_path,
                installed_at: now.clone(),
            });
        }

        // Update lock
        let mut global_lock = load_global_lock();
        if let Some(lock_entry) = global_lock.skills.get_mut(name) {
            lock_entry.canonical_path = new_canonical_path.to_string_lossy().to_string();
            lock_entry.content_hash = new_hash.clone();
            lock_entry.version = metadata.version.clone();
            lock_entry.author = metadata.author.clone();
            lock_entry.tags = metadata.tags.clone();
            lock_entry.installs = new_installs.clone();
            lock_entry.updated_at = now.clone();
        }
        save_global_lock(&global_lock)?;

        let source = Source {
            source_type: entry.source.source_type,
            url: entry.source.url,
            subpath: entry.source.subpath,
            git_ref: entry.source.git_ref,
            provider: entry.source.provider,
        };

        let agent_installs: Vec<AgentInstallRecord> = new_installs
            .iter()
            .map(|i| AgentInstallRecord {
                agent: i.agent.clone(),
                scope: i.scope.clone(),
                mode: i.mode.clone(),
                installed_path: i.installed_path.clone(),
                installed_at: i.installed_at.clone(),
            })
            .collect();

        Ok(Skill {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            description: metadata.description.unwrap_or_default(),
            source,
            canonical_path: new_canonical_path.to_string_lossy().to_string(),
            version: metadata.version,
            author: metadata.author,
            tags: metadata.tags,
            installs: agent_installs,
            updated_at: now,
            tree_sha: None,
            content_hash: new_hash,
        })
    }

    /// List all installed skills, optionally filtered by agent, scope, or query string.
    pub fn list_skills(
        &self,
        agent: Option<&str>,
        scope: Option<&str>,
        query: Option<&str>,
    ) -> Vec<Skill> {
        let global_lock = load_global_lock();

        global_lock
            .skills
            .iter()
            .filter(|(name, entry)| {
                let installs = visible_installs(entry);
                if installs.is_empty() {
                    return false;
                }

                // Filter by agent
                if let Some(agent_filter) = agent {
                    // Special handling for "universal" - match any universal agent
                    if agent_filter == "universal" {
                        use crate::agent::registry::is_universal_agent;
                        if !installs.iter().any(|i| is_universal_agent(&i.agent)) {
                            return false;
                        }
                    } else if !installs.iter().any(|i| i.agent == agent_filter) {
                        return false;
                    }
                }

                // Filter by scope
                if let Some(scope_filter) = scope {
                    if !installs.iter().any(|i| i.scope == scope_filter) {
                        return false;
                    }
                }

                // Filter by query (case-insensitive substring match on name and tags)
                if let Some(q) = query {
                    let q_lower = q.to_lowercase();
                    let name_matches = name.to_lowercase().contains(&q_lower);
                    let tag_matches = entry
                        .tags
                        .iter()
                        .any(|t| t.to_lowercase().contains(&q_lower));
                    if !name_matches && !tag_matches {
                        return false;
                    }
                }

                true
            })
            .map(|(name, entry)| lock_entry_to_skill(name, entry))
            .collect()
    }

    /// Check for updates across all installed skills.
    pub async fn check_updates(&self) -> Result<Vec<UpdateCheckResult>, CommandError> {
        let global_lock = load_global_lock();
        let mut results = Vec::new();

        for (name, entry) in &global_lock.skills {
            let parsed = parse_source(&entry.source.url);
            let provider = match self.find_provider(&parsed) {
                Some(p) => p,
                None => {
                    warn!(
                        "No provider for skill '{}' source type '{}', skipping",
                        name, entry.source.source_type
                    );
                    continue;
                }
            };

            let resolved_list = match provider.resolve(&parsed).await {
                Ok(list) => list,
                Err(e) => {
                    warn!("Failed to resolve '{}' for update check: {}", name, e);
                    continue;
                }
            };

            let resolved = match resolved_list.first() {
                Some(r) => r,
                None => continue,
            };

            // Fetch to a temp dir to compute hash
            let temp_dir =
                std::env::temp_dir().join(format!("skill_update_check_{}", uuid::Uuid::new_v4()));
            std::fs::create_dir_all(&temp_dir)?;

            match provider.fetch(resolved, &temp_dir).await {
                Ok(()) => {
                    let latest_hash = match compute_content_hash(&temp_dir) {
                        Ok(h) => h,
                        Err(e) => {
                            warn!("Failed to compute hash for '{}': {}", name, e);
                            let _ = std::fs::remove_dir_all(&temp_dir);
                            continue;
                        }
                    };

                    // Try to parse version from latest SKILL.md
                    let latest_version = temp_dir
                        .join("SKILL.md")
                        .exists()
                        .then(|| read_skill_md(&temp_dir).ok().and_then(|meta| meta.version))
                        .flatten();

                    let has_update = latest_hash != entry.content_hash;
                    results.push(UpdateCheckResult {
                        name: name.clone(),
                        current_hash: entry.content_hash.clone(),
                        latest_hash,
                        has_update,
                        current_version: entry.version.clone(),
                        latest_version,
                    });
                }
                Err(e) => {
                    warn!("Failed to fetch '{}' for update check: {}", name, e);
                }
            }

            let _ = std::fs::remove_dir_all(&temp_dir);
        }

        Ok(results)
    }

    /// Resolve a source string to a list of skills that can be installed.
    pub async fn resolve_source(
        &self,
        source_str: &str,
    ) -> Result<Vec<ResolvedSkill>, CommandError> {
        let parsed = parse_source(source_str);

        let provider = self.find_provider(&parsed).ok_or_else(|| {
            CommandError::ProviderError(format!(
                "No provider available for source type: {}",
                parsed.source_type
            ))
        })?;

        let provider_resolved = provider.resolve(&parsed).await?;

        // Convert from provider::traits::ResolvedSkill to commands::skills::ResolvedSkill
        let results: Vec<ResolvedSkill> = provider_resolved
            .into_iter()
            .map(|r| {
                let source = Source {
                    source_type: r.source_type.clone(),
                    url: r.source_url.clone(),
                    subpath: r.subpath.clone(),
                    git_ref: parsed.git_ref.clone(),
                    provider: Some(r.provider.clone()),
                };
                ResolvedSkill {
                    name: r.name,
                    description: r.description,
                    source,
                    provider: r.provider,
                }
            })
            .collect();

        Ok(results)
    }

    /// Get detailed information about a specific installed skill.
    pub fn get_skill_detail(&self, name: &str) -> Result<SkillDetail, CommandError> {
        let global_lock = load_global_lock();

        let entry = global_lock
            .skills
            .get(name)
            .ok_or_else(|| CommandError::SkillNotFound(name.to_string()))?;

        let skill = lock_entry_to_skill(name, entry);

        // Read content from canonical path
        let canonical = Path::new(&entry.canonical_path);
        let readme_content = if canonical.exists() {
            let skill_md_path = canonical.join("SKILL.md");
            if skill_md_path.exists() {
                std::fs::read_to_string(&skill_md_path).unwrap_or_default()
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        // List files in canonical path
        let file_list = if canonical.exists() {
            list_files_recursive(canonical, canonical)
        } else {
            vec![]
        };

        // Build source URL for display
        let source_url =
            if entry.source.source_type == "github" || entry.source.source_type == "gitlab" {
                Some(entry.source.url.trim_end_matches(".git").to_string())
            } else {
                None
            };

        Ok(SkillDetail {
            skill,
            readme_content,
            file_list,
            source_url,
        })
    }
}

impl Default for SkillEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Install a skill to a specific agent by creating a symlink or copy.
///
/// Returns the path where the skill was installed.
fn install_to_agent(
    agent: &AgentRegistryEntry,
    canonical_path: &Path,
    skill_name: &str,
    mode: &str,
    scope: &str,
) -> Result<String, CommandError> {
    let target_dir = if scope == "global" {
        PathBuf::from(&agent.global_skills_dir)
    } else {
        // Project scope: use the agent's project-level skills_dir relative to cwd
        let cwd = std::env::current_dir().map_err(|e| {
            CommandError::InternalError(format!("Cannot determine current directory: {}", e))
        })?;
        cwd.join(&agent.skills_dir)
    };

    // Ensure parent directory exists
    std::fs::create_dir_all(&target_dir)?;

    let installed_path = target_dir.join(skill_name);

    // Remove existing if present
    if installed_path.exists() || installed_path.is_symlink() {
        if installed_path.is_symlink() || installed_path.is_file() {
            std::fs::remove_file(&installed_path)?;
        } else if installed_path.is_dir() {
            std::fs::remove_dir_all(&installed_path)?;
        }
    }

    match mode {
        "symlink" => {
            #[cfg(unix)]
            {
                std::os::unix::fs::symlink(canonical_path, &installed_path)?;
                info!(
                    "Created symlink: {} -> {}",
                    installed_path.display(),
                    canonical_path.display()
                );
            }
            #[cfg(not(unix))]
            {
                // Fallback to copy on non-Unix platforms
                copy_dir_all(canonical_path, &installed_path)?;
                info!(
                    "Copied (symlink fallback): {} -> {}",
                    canonical_path.display(),
                    installed_path.display()
                );
            }
        }
        "copy" => {
            copy_dir_all(canonical_path, &installed_path)?;
            info!(
                "Copied skill: {} -> {}",
                canonical_path.display(),
                installed_path.display()
            );
        }
        _ => {
            // Default to symlink
            #[cfg(unix)]
            {
                std::os::unix::fs::symlink(canonical_path, &installed_path)?;
            }
            #[cfg(not(unix))]
            {
                copy_dir_all(canonical_path, &installed_path)?;
            }
        }
    }

    Ok(installed_path.to_string_lossy().to_string())
}

/// Recursively copy a directory tree, skipping `.git`.
fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), CommandError> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        if file_name == ".git" {
            continue;
        }

        if src_path.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

/// Recursively list files relative to a root directory, skipping `.git`.
fn list_files_recursive(root: &Path, current: &Path) -> Vec<String> {
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(current) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name();

            if name == ".git" {
                continue;
            }

            if path.is_dir() {
                files.extend(list_files_recursive(root, &path));
            } else if let Ok(relative) = path.strip_prefix(root) {
                files.push(relative.to_string_lossy().to_string());
            }
        }
    }
    files.sort();
    files
}

fn is_supported_install_agent(agent: &str) -> bool {
    agent == "global" || get_agent(agent).is_some()
}

fn visible_installs(entry: &GlobalSkillEntry) -> Vec<AgentInstallRecord> {
    entry
        .installs
        .iter()
        .filter(|i| is_supported_install_agent(&i.agent))
        .map(|i| AgentInstallRecord {
            agent: i.agent.clone(),
            scope: i.scope.clone(),
            mode: i.mode.clone(),
            installed_path: i.installed_path.clone(),
            installed_at: i.installed_at.clone(),
        })
        .collect()
}

/// Convert a lock file entry to a `Skill` struct for the frontend.
fn lock_entry_to_skill(name: &str, entry: &GlobalSkillEntry) -> Skill {
    let source = Source {
        source_type: entry.source.source_type.clone(),
        url: entry.source.url.clone(),
        subpath: entry.source.subpath.clone(),
        git_ref: entry.source.git_ref.clone(),
        provider: entry.source.provider.clone(),
    };

    let installs = visible_installs(entry);

    Skill {
        id: uuid::Uuid::new_v4().to_string(),
        name: name.to_string(),
        description: entry.description.clone().unwrap_or_default(),
        source,
        canonical_path: entry.canonical_path.clone(),
        version: entry.version.clone(),
        author: entry.author.clone(),
        tags: entry.tags.clone(),
        installs,
        updated_at: entry.updated_at.clone(),
        tree_sha: entry.tree_sha.clone(),
        content_hash: entry.content_hash.clone(),
    }
}
