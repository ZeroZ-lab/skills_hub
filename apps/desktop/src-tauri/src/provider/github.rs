use async_trait::async_trait;
use log::{debug, info, warn};
use serde::Deserialize;
use std::path::Path;

use crate::config::app_config;
use crate::error::CommandError;
use crate::git::clone;
use crate::source::parser::ParsedSource;

use super::traits::{HostProvider, ResolvedSkill};

/// GitHub-based skill provider.
///
/// Resolves skills from GitHub repositories by:
/// 1. Using the GitHub API to list the repo tree
/// 2. Finding directories that contain a SKILL.md file
/// 3. Fetching skill contents via git clone
pub struct GitHubProvider {
    client: reqwest::Client,
    github_token: Option<String>,
}

/// Represents an item in the GitHub Git Tree API response.
#[derive(Debug, Deserialize)]
struct GitTreeItem {
    path: String,
    #[serde(rename = "type")]
    item_type: String,
}

/// Response from the GitHub Git Tree API.
#[derive(Debug, Deserialize)]
struct GitTreeResponse {
    tree: Vec<GitTreeItem>,
    truncated: bool,
}

/// Response from the GitHub Repos API (for default branch).
#[derive(Debug, Deserialize)]
struct RepoInfoResponse {
    default_branch: String,
}

impl GitHubProvider {
    pub fn new() -> Self {
        let config = app_config::load_config();
        let mut builder = reqwest::Client::builder().user_agent("skills-manager/0.3.0");

        if let Some(proxy_url) = config.proxy.as_deref().filter(|v| !v.trim().is_empty()) {
            match reqwest::Proxy::all(proxy_url) {
                Ok(proxy) => {
                    builder = builder.proxy(proxy);
                }
                Err(err) => {
                    warn!(
                        "Invalid proxy configuration '{}', ignoring proxy: {}",
                        proxy_url, err
                    );
                }
            }
        }

        Self {
            client: builder
                .build()
                .expect("Failed to build reqwest client"),
            github_token: config.github_token,
        }
    }

    fn github_get(&self, url: &str) -> reqwest::RequestBuilder {
        let request = self.client.get(url);
        if let Some(token) = self.github_token.as_deref().filter(|v| !v.trim().is_empty()) {
            request.bearer_auth(token)
        } else {
            request
        }
    }

    /// Fetch the default branch of a GitHub repository.
    async fn get_default_branch(&self, owner: &str, repo: &str) -> Result<String, CommandError> {
        let url = format!("https://api.github.com/repos/{}/{}", owner, repo);
        debug!("Fetching repo info from: {}", url);

        let response = self.github_get(&url).send().await.map_err(|e| {
            CommandError::NetworkError(format!("Failed to fetch repo info: {}", e))
        })?;

        if !response.status().is_success() {
            let status = response.status();
            if status.as_u16() == 403 {
                return Err(CommandError::RateLimit);
            }
            return Err(CommandError::NetworkError(format!(
                "GitHub API returned status {} for {}/{}",
                status, owner, repo
            )));
        }

        let info: RepoInfoResponse = response
            .json()
            .await
            .map_err(|e| CommandError::NetworkError(format!("Failed to parse repo info: {}", e)))?;

        Ok(info.default_branch)
    }

    /// Fetch the full git tree for a repository at a given ref.
    async fn get_tree(
        &self,
        owner: &str,
        repo: &str,
        git_ref: &str,
    ) -> Result<GitTreeResponse, CommandError> {
        let url = format!(
            "https://api.github.com/repos/{}/{}/git/trees/{}?recursive=1",
            owner, repo, git_ref
        );
        debug!("Fetching tree from: {}", url);

        let response = self
            .github_get(&url)
            .send()
            .await
            .map_err(|e| CommandError::NetworkError(format!("Failed to fetch tree: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            if status.as_u16() == 403 {
                return Err(CommandError::RateLimit);
            }
            return Err(CommandError::NetworkError(format!(
                "GitHub API returned status {} when fetching tree for {}/{}@{}",
                status, owner, repo, git_ref
            )));
        }

        let tree: GitTreeResponse = response
            .json()
            .await
            .map_err(|e| CommandError::NetworkError(format!("Failed to parse tree: {}", e)))?;

        if tree.truncated {
            warn!(
                "GitHub tree response was truncated for {}/{}@{} — some skills may be missed",
                owner, repo, git_ref
            );
        }

        Ok(tree)
    }

    /// Find all directories containing SKILL.md within a tree, optionally filtered
    /// by a subpath prefix.
    fn find_skill_dirs(
        &self,
        tree: &GitTreeResponse,
        subpath: Option<&str>,
        skill_name: Option<&str>,
    ) -> Vec<String> {
        // Collect all SKILL.md paths
        let skill_md_paths: Vec<&str> = tree
            .tree
            .iter()
            .filter(|item| {
                item.item_type == "blob"
                    && (item.path.ends_with("/SKILL.md") || item.path == "SKILL.md")
            })
            .map(|item| item.path.as_str())
            .collect();

        let mut skill_dirs: Vec<String> = Vec::new();

        for path in skill_md_paths {
            // Get the directory containing SKILL.md
            let dir = if path == "SKILL.md" {
                "".to_string()
            } else {
                path.trim_end_matches("/SKILL.md").to_string()
            };

            // Apply subpath filter
            if let Some(sp) = subpath {
                let sp = sp.trim_end_matches('/');
                if !sp.is_empty() {
                    // The dir must be equal to the subpath or be under it
                    if dir != sp && !dir.starts_with(&format!("{}/", sp)) {
                        continue;
                    }
                }
            }

            // Apply skill name filter (from @skill syntax)
            if let Some(name) = skill_name {
                // The directory name (last component) should match the skill name
                let dir_name = dir.rsplit('/').next().unwrap_or(&dir);
                if dir_name != name {
                    continue;
                }
            }

            skill_dirs.push(dir);
        }

        skill_dirs
    }
}

impl Default for GitHubProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl HostProvider for GitHubProvider {
    fn name(&self) -> &str {
        "github"
    }

    fn can_handle(&self, parsed: &ParsedSource) -> bool {
        parsed.source_type == "github"
    }

    async fn resolve(&self, parsed: &ParsedSource) -> Result<Vec<ResolvedSkill>, CommandError> {
        let owner = parsed.owner.as_deref().ok_or_else(|| {
            CommandError::InvalidSource("GitHub source missing owner".to_string())
        })?;
        let repo = parsed
            .repo
            .as_deref()
            .ok_or_else(|| CommandError::InvalidSource("GitHub source missing repo".to_string()))?;

        // Determine the ref to use
        let git_ref = match &parsed.git_ref {
            Some(r) => r.clone(),
            None => self.get_default_branch(owner, repo).await?,
        };

        // Fetch the full tree
        let tree = self.get_tree(owner, repo, &git_ref).await?;

        // Find skill directories
        let skill_dirs = self.find_skill_dirs(
            &tree,
            parsed.subpath.as_deref(),
            parsed.skill_name.as_deref(),
        );

        if skill_dirs.is_empty() {
            // If a specific subpath was requested, check if that exact subpath has a SKILL.md
            // at the root. If not, still return the subpath as a potential skill location.
            if let Some(subpath) = &parsed.subpath {
                info!(
                    "No SKILL.md found in tree for {}/{}; using subpath {} as skill dir",
                    owner, repo, subpath
                );
                return Ok(vec![ResolvedSkill {
                    name: subpath.rsplit('/').next().unwrap_or(subpath).to_string(),
                    description: None,
                    source_url: parsed.url.clone(),
                    source_type: "github".to_string(),
                    provider: self.name().to_string(),
                    subpath: Some(subpath.clone()),
                }]);
            }

            // Root-level SKILL.md check: the repo itself might be a single skill
            let has_root_skill_md = tree
                .tree
                .iter()
                .any(|item| item.path == "SKILL.md" && item.item_type == "blob");

            if has_root_skill_md {
                return Ok(vec![ResolvedSkill {
                    name: repo.to_string(),
                    description: None,
                    source_url: parsed.url.clone(),
                    source_type: "github".to_string(),
                    provider: self.name().to_string(),
                    subpath: None,
                }]);
            }

            return Err(CommandError::InvalidSkill(format!(
                "No SKILL.md found in {}/{}",
                owner, repo
            )));
        }

        // Build resolved skills from found directories
        let skills: Vec<ResolvedSkill> = skill_dirs
            .into_iter()
            .map(|dir| {
                let name = if dir.is_empty() {
                    repo.to_string()
                } else {
                    dir.rsplit('/').next().unwrap_or(&dir).to_string()
                };
                let subpath = if dir.is_empty() { None } else { Some(dir) };
                ResolvedSkill {
                    name,
                    description: None,
                    source_url: parsed.url.clone(),
                    source_type: "github".to_string(),
                    provider: self.name().to_string(),
                    subpath,
                }
            })
            .collect();

        info!("Resolved {} skill(s) from {}/{}", skills.len(), owner, repo);
        Ok(skills)
    }

    async fn fetch(&self, resolved: &ResolvedSkill, target_dir: &Path) -> Result<(), CommandError> {
        info!(
            "Fetching skill '{}' from {} into {}",
            resolved.name,
            resolved.source_url,
            target_dir.display()
        );

        // Strategy: clone (or shallow clone) the repo into a cache directory,
        // then copy the relevant subpath into target_dir.
        let cache_dir = crate::git::utils::get_cache_path(&resolved.source_url);

        // Clone or pull the repo into cache
        clone::clone_or_pull(&resolved.source_url, &cache_dir)?;

        // Determine the source directory within the clone
        let source_dir = if let Some(subpath) = &resolved.subpath {
            cache_dir.join(subpath)
        } else {
            cache_dir.clone()
        };

        if !source_dir.exists() {
            return Err(CommandError::ProviderError(format!(
                "Skill directory does not exist in cloned repo: {}",
                source_dir.display()
            )));
        }

        // Copy the skill directory contents to target_dir
        copy_dir_recursive(&source_dir, target_dir)?;

        info!(
            "Successfully fetched skill '{}' to {}",
            resolved.name,
            target_dir.display()
        );
        Ok(())
    }
}

/// Recursively copy a directory and its contents.
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), CommandError> {
    if !dst.exists() {
        std::fs::create_dir_all(dst)?;
    }

    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        // Skip .git directory
        if file_name == ".git" {
            continue;
        }

        if entry_path.is_dir() {
            copy_dir_recursive(&entry_path, &dst_path)?;
        } else {
            std::fs::copy(&entry_path, &dst_path)?;
        }
    }

    Ok(())
}
