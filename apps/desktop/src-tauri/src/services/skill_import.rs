use crate::agent::registry::{get_agent, get_all_agents, AgentRegistryEntry};
use crate::error::CommandError;
use crate::lock::global::{self, GlobalSkillEntry, LockInstallRecord, LockSource};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub found: usize,
    pub imported: usize,
    pub updated: usize,
    pub removed: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

/// Helper function to trim quotes from YAML values
fn trim_yaml_quotes(s: &str) -> String {
    s.trim().trim_matches('"').trim_matches('\'').to_string()
}

/// Parse SKILL.md frontmatter to extract metadata
fn parse_skill_metadata(
    skill_md_path: &Path,
) -> Result<(String, Option<String>, Option<String>, Vec<String>), String> {
    let content = std::fs::read_to_string(skill_md_path)
        .map_err(|e| format!("Failed to read SKILL.md: {}", e))?;

    // Simple frontmatter parser (looks for --- delimited YAML)
    let mut name = skill_md_path
        .parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let mut description: Option<String> = None;
    let mut author: Option<String> = None;
    let mut tags: Vec<String> = Vec::new();

    // Check if content starts with frontmatter delimiter
    if content.starts_with("---\n") {
        // Find the closing delimiter (second occurrence of "---")
        if let Some(frontmatter_end) = content[4..].find("\n---") {
            let frontmatter = &content[4..4 + frontmatter_end];
            for line in frontmatter.lines() {
                if let Some(name_val) = line.strip_prefix("name:") {
                    name = trim_yaml_quotes(name_val);
                } else if let Some(desc_val) = line.strip_prefix("description:") {
                    description = Some(trim_yaml_quotes(desc_val));
                } else if let Some(author_val) = line.strip_prefix("author:") {
                    author = Some(trim_yaml_quotes(author_val));
                } else if let Some(tags_val) = line.strip_prefix("tags:") {
                    tags = tags_val
                        .trim()
                        .trim_matches(|c| c == '[' || c == ']')
                        .split(',')
                        .map(|s| trim_yaml_quotes(s))
                        .filter(|s| !s.is_empty())
                        .collect();
                }
            }
        }
    }

    Ok((name, description, author, tags))
}

/// Calculate a simple content hash for a directory
fn calculate_content_hash(dir_path: &Path) -> Result<String, String> {
    use sha2::{Digest, Sha256};

    let mut hasher = Sha256::new();

    // Hash the directory name and modification time as a simple hash
    if let Some(name) = dir_path.file_name() {
        hasher.update(name.to_string_lossy().as_bytes());
    }

    // Hash SKILL.md content if it exists
    let skill_md = dir_path.join("SKILL.md");
    if skill_md.exists() {
        if let Ok(content) = std::fs::read(&skill_md) {
            hasher.update(&content);
        }
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

fn push_unique_path(paths: &mut Vec<PathBuf>, seen: &mut HashSet<String>, path: PathBuf) {
    let key = path.to_string_lossy().to_string();
    if seen.insert(key) {
        paths.push(path);
    }
}

fn build_candidate_paths(entry: &AgentRegistryEntry) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let mut seen = HashSet::new();

    push_unique_path(
        &mut paths,
        &mut seen,
        PathBuf::from(&entry.global_skills_dir),
    );

    for detect_path in &entry.detect_paths {
        push_unique_path(
            &mut paths,
            &mut seen,
            PathBuf::from(detect_path).join("skills"),
        );
    }

    paths
}

fn collect_scan_targets() -> Vec<(PathBuf, String)> {
    let mut targets = Vec::new();
    let mut seen = HashSet::new();
    let shared_dir = dirs::home_dir().map(|p| p.join(".agents/skills"));

    if let Some(shared_dir) = shared_dir.clone() {
        let key = shared_dir.to_string_lossy().to_string();
        if seen.insert(key) {
            targets.push((shared_dir, "universal".to_string()));
        }
    }

    for entry in get_all_agents() {
        if entry.agent_type == "universal" {
            continue;
        }

        for path in build_candidate_paths(&entry) {
            if shared_dir.as_ref().is_some_and(|shared| *shared == path) {
                continue;
            }

            let key = path.to_string_lossy().to_string();
            if seen.insert(key) {
                targets.push((path, entry.agent_type.clone()));
            }
        }
    }

    targets
}

fn collect_agent_scan_targets(agent: &str) -> Result<Vec<(PathBuf, String)>, CommandError> {
    let entry = get_agent(agent)
        .ok_or_else(|| CommandError::AgentNotFound(format!("Unknown agent: {}", agent)))?;

    let targets = build_candidate_paths(&entry)
        .into_iter()
        .map(|path| (path, agent.to_string()))
        .collect();

    Ok(targets)
}

fn scan_and_import_from_targets(
    targets: Vec<(PathBuf, String)>,
) -> Result<(BTreeMap<String, GlobalSkillEntry>, ScanResult), CommandError> {
    let mut result = ScanResult {
        found: 0,
        imported: 0,
        updated: 0,
        removed: 0,
        skipped: 0,
        errors: Vec::new(),
    };

    let mut discovered_skills: BTreeMap<String, GlobalSkillEntry> = BTreeMap::new();
    let mut processed_paths: HashSet<String> = HashSet::new();

    for (path, agent) in targets {
        if !path.exists() {
            continue;
        }

        let entries = match std::fs::read_dir(&path) {
            Ok(entries) => entries,
            Err(e) => {
                result
                    .errors
                    .push(format!("Failed to read {}: {}", path.display(), e));
                continue;
            }
        };

        for entry in entries.flatten() {
            let skill_path = entry.path();
            let canonical_path = match skill_path.canonicalize() {
                Ok(path) => path,
                Err(e) => {
                    if e.kind() == std::io::ErrorKind::NotFound {
                        result.skipped += 1;
                        continue;
                    }

                    result.errors.push(format!(
                        "Failed to resolve {}: {}",
                        skill_path.display(),
                        e
                    ));
                    continue;
                }
            };

            let canonical_key = canonical_path.to_string_lossy().to_string();
            if !processed_paths.insert(canonical_key) || !canonical_path.is_dir() {
                continue;
            }

            let skill_md = canonical_path.join("SKILL.md");
            if !skill_md.exists() {
                continue;
            }

            result.found += 1;

            let (skill_name, description, author, tags) = match parse_skill_metadata(&skill_md) {
                Ok(meta) => meta,
                Err(e) => {
                    result
                        .errors
                        .push(format!("Failed to parse {}: {}", skill_md.display(), e));
                    result.skipped += 1;
                    continue;
                }
            };

            let content_hash = match calculate_content_hash(&canonical_path) {
                Ok(hash) => hash,
                Err(e) => {
                    result.errors.push(format!(
                        "Failed to hash {}: {}",
                        canonical_path.display(),
                        e
                    ));
                    result.skipped += 1;
                    continue;
                }
            };

            let now = chrono::Utc::now().to_rfc3339();
            let entry = GlobalSkillEntry {
                source: LockSource {
                    source_type: "local".to_string(),
                    url: canonical_path.to_string_lossy().to_string(),
                    subpath: None,
                    git_ref: None,
                    provider: Some("local".to_string()),
                },
                canonical_path: canonical_path.to_string_lossy().to_string(),
                description,
                version: None,
                author,
                tags,
                tree_sha: None,
                content_hash,
                installs: vec![LockInstallRecord {
                    agent: agent.clone(),
                    scope: "global".to_string(),
                    mode: "existing".to_string(),
                    installed_path: canonical_path.to_string_lossy().to_string(),
                    installed_at: now.clone(),
                }],
                updated_at: now,
            };

            if let Some(existing) = discovered_skills.get_mut(&skill_name) {
                if existing.canonical_path != entry.canonical_path {
                    result.errors.push(format!(
                        "Skill '{}' found in multiple locations; using {}",
                        skill_name, entry.canonical_path
                    ));
                }

                existing.source = entry.source;
                existing.canonical_path = entry.canonical_path;
                existing.description = entry.description;
                existing.version = entry.version;
                existing.author = entry.author;
                existing.tags = entry.tags;
                existing.tree_sha = entry.tree_sha;
                existing.content_hash = entry.content_hash;
                existing.updated_at = entry.updated_at;

                for install in entry.installs {
                    if let Some(existing_install) = existing
                        .installs
                        .iter_mut()
                        .find(|i| i.agent == install.agent)
                    {
                        *existing_install = install;
                    } else {
                        existing.installs.push(install);
                    }
                }
            } else {
                discovered_skills.insert(skill_name, entry);
            }
        }
    }

    Ok((discovered_skills, result))
}

/// Scan system directories for installed skills and import them into the lock file
pub async fn scan_and_import_skills() -> Result<ScanResult, CommandError> {
    let previous_lock = global::load_global_lock();
    let (discovered_skills, mut result) = scan_and_import_from_targets(collect_scan_targets())?;

    let previous_names: HashSet<String> = previous_lock.skills.keys().cloned().collect();
    let discovered_names: HashSet<String> = discovered_skills.keys().cloned().collect();

    result.imported = discovered_names.difference(&previous_names).count();
    result.updated = discovered_names.intersection(&previous_names).count();
    result.removed = previous_names.difference(&discovered_names).count();

    let mut new_lock = previous_lock;
    new_lock.skills = discovered_skills;
    global::save_global_lock(&new_lock)?;

    Ok(result)
}

/// Import skills from a specific agent's directory
pub async fn import_skills_from_agent(agent: &str) -> Result<ScanResult, CommandError> {
    let targets = collect_agent_scan_targets(agent)?;

    if !targets.iter().any(|(path, _)| path.exists()) {
        return Err(CommandError::InternalError(format!(
            "Skills directory not found for agent: {}",
            agent
        )));
    }

    let mut lock_file = global::load_global_lock();
    let (discovered_skills, mut result) = scan_and_import_from_targets(targets)?;

    let previous_agent_names: HashSet<String> = lock_file
        .skills
        .iter()
        .filter(|(_, entry)| entry.installs.iter().any(|install| install.agent == agent))
        .map(|(name, _)| name.clone())
        .collect();

    let discovered_names: HashSet<String> = discovered_skills.keys().cloned().collect();
    result.imported = discovered_names.difference(&previous_agent_names).count();
    result.updated = discovered_names.intersection(&previous_agent_names).count();
    result.removed = previous_agent_names.difference(&discovered_names).count();

    for entry in lock_file.skills.values_mut() {
        entry.installs.retain(|install| install.agent != agent);
    }
    lock_file
        .skills
        .retain(|_, entry| !entry.installs.is_empty());

    for (skill_name, discovered_entry) in discovered_skills {
        if let Some(existing) = lock_file.skills.get_mut(&skill_name) {
            existing.source = discovered_entry.source;
            existing.canonical_path = discovered_entry.canonical_path;
            existing.description = discovered_entry.description;
            existing.version = discovered_entry.version;
            existing.author = discovered_entry.author;
            existing.tags = discovered_entry.tags;
            existing.tree_sha = discovered_entry.tree_sha;
            existing.content_hash = discovered_entry.content_hash;
            existing.updated_at = discovered_entry.updated_at;
            existing.installs.extend(discovered_entry.installs);
        } else {
            lock_file.skills.insert(skill_name, discovered_entry);
        }
    }

    global::save_global_lock(&lock_file)?;

    Ok(result)
}
