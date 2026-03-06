use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

use crate::config::app_config;

/// Structured representation of a parsed skill source.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedSource {
    /// One of: "github", "gitlab", "git", "local", "well-known"
    pub source_type: String,
    /// Canonical URL (or resolved local path)
    pub url: String,
    /// Repository owner (GitHub/GitLab)
    pub owner: Option<String>,
    /// Repository name (GitHub/GitLab)
    pub repo: Option<String>,
    /// Sub-path within the repository (e.g., "path/to/skill")
    pub subpath: Option<String>,
    /// Git ref (branch, tag, or commit)
    pub git_ref: Option<String>,
    /// Skill name filter extracted from `@skill` syntax
    pub skill_name: Option<String>,
    /// Original local path (only for source_type "local")
    pub local_path: Option<String>,
}

/// Source aliases: map common shorthand to canonical source.
fn get_source_aliases() -> HashMap<String, String> {
    let mut aliases = HashMap::new();

    aliases.insert(
        "coinbase/agentWallet".to_string(),
        "coinbase/agentic-wallet-skills".to_string(),
    );

    let config = app_config::load_config();
    aliases.extend(config.source_aliases);

    aliases
}

/// Check if a string represents a local file system path.
fn is_local_path(input: &str) -> bool {
    // Absolute Unix path
    if input.starts_with('/') {
        return true;
    }
    // Relative paths
    if input.starts_with("./") || input.starts_with("../") {
        return true;
    }
    // Current or parent directory
    if input == "." || input == ".." {
        return true;
    }
    // Windows absolute paths like C:\ or D:/
    let win_re = Regex::new(r"^[a-zA-Z]:[/\\]").unwrap();
    if win_re.is_match(input) {
        return true;
    }
    false
}

/// Check if a URL could be a well-known skills endpoint.
/// Must be HTTP(S) and not a known git host (GitHub, GitLab).
/// Also excludes URLs that look like git repos (.git suffix).
fn is_well_known_url(input: &str) -> bool {
    if !input.starts_with("http://") && !input.starts_with("https://") {
        return false;
    }

    // Try to parse as URL
    let parsed = match url::Url::parse(input) {
        Ok(u) => u,
        Err(_) => return false,
    };

    let hostname = match parsed.host_str() {
        Some(h) => h,
        None => return false,
    };

    // Exclude known git hosts that have their own handling
    let excluded_hosts = ["github.com", "gitlab.com", "raw.githubusercontent.com"];
    if excluded_hosts.contains(&hostname) {
        return false;
    }

    // Don't match URLs that look like git repos
    if input.ends_with(".git") {
        return false;
    }

    true
}

/// Resolve a potentially relative path to an absolute path.
fn resolve_path(input: &str) -> String {
    let path = Path::new(input);
    if path.is_absolute() {
        return path.to_string_lossy().to_string();
    }
    // Resolve relative to current working directory
    match std::env::current_dir() {
        Ok(cwd) => cwd.join(path).to_string_lossy().to_string(),
        Err(_) => input.to_string(),
    }
}

/// Parse a source string into a structured `ParsedSource`.
///
/// Supports:
/// - Local paths (absolute, relative, `.`, `..`)
/// - GitHub URLs with tree+path, tree only, or basic repo
/// - GitLab URLs with `/-/tree/` pattern or basic gitlab.com URLs
/// - GitHub shorthand: `owner/repo`, `owner/repo/path`, `owner/repo@skill-name`
/// - Well-known HTTP(S) URLs (non-GitHub/GitLab)
/// - Fallback: direct git URL
pub fn parse_source(input: &str) -> ParsedSource {
    // Resolve source aliases before parsing
    let aliases = get_source_aliases();
    let input = aliases.get(input).map_or(input, String::as_str);

    // 1. Local path: absolute, relative, or current directory
    if is_local_path(input) {
        let resolved_path = resolve_path(input);
        return ParsedSource {
            source_type: "local".to_string(),
            url: resolved_path.clone(),
            owner: None,
            repo: None,
            subpath: None,
            git_ref: None,
            skill_name: None,
            local_path: Some(resolved_path),
        };
    }

    // 2. GitHub URL with tree+path: github.com/owner/repo/tree/branch/path/to/skill
    let github_tree_with_path_re =
        Regex::new(r"github\.com/([^/]+)/([^/]+)/tree/([^/]+)/(.+)").unwrap();
    if let Some(caps) = github_tree_with_path_re.captures(input) {
        let owner = caps.get(1).unwrap().as_str().to_string();
        let repo = caps.get(2).unwrap().as_str().to_string();
        let git_ref = caps.get(3).unwrap().as_str().to_string();
        let subpath = caps.get(4).unwrap().as_str().to_string();
        return ParsedSource {
            source_type: "github".to_string(),
            url: format!("https://github.com/{}/{}.git", owner, repo),
            owner: Some(owner),
            repo: Some(repo),
            subpath: Some(subpath),
            git_ref: Some(git_ref),
            skill_name: None,
            local_path: None,
        };
    }

    // 3. GitHub URL with branch only: github.com/owner/repo/tree/branch
    let github_tree_re = Regex::new(r"github\.com/([^/]+)/([^/]+)/tree/([^/]+)$").unwrap();
    if let Some(caps) = github_tree_re.captures(input) {
        let owner = caps.get(1).unwrap().as_str().to_string();
        let repo = caps.get(2).unwrap().as_str().to_string();
        let git_ref = caps.get(3).unwrap().as_str().to_string();
        return ParsedSource {
            source_type: "github".to_string(),
            url: format!("https://github.com/{}/{}.git", owner, repo),
            owner: Some(owner),
            repo: Some(repo),
            subpath: None,
            git_ref: Some(git_ref),
            skill_name: None,
            local_path: None,
        };
    }

    // 4. GitHub URL basic: github.com/owner/repo
    let github_repo_re = Regex::new(r"github\.com/([^/]+)/([^/]+)").unwrap();
    if let Some(caps) = github_repo_re.captures(input) {
        let owner = caps.get(1).unwrap().as_str().to_string();
        let repo = caps.get(2).unwrap().as_str().to_string();
        let clean_repo = repo.trim_end_matches(".git").to_string();
        return ParsedSource {
            source_type: "github".to_string(),
            url: format!("https://github.com/{}/{}.git", owner, clean_repo),
            owner: Some(owner),
            repo: Some(clean_repo),
            subpath: None,
            git_ref: None,
            skill_name: None,
            local_path: None,
        };
    }

    // 5. GitLab URL with /-/tree/ pattern (with path):
    //    https://gitlab.com/owner/repo/-/tree/branch/path
    //    Supports any GitLab instance and subgroups via non-greedy match.
    let gitlab_tree_with_path_re =
        Regex::new(r"^(https?)://([^/]+)/(.+?)/-/tree/([^/]+)/(.+)").unwrap();
    if let Some(caps) = gitlab_tree_with_path_re.captures(input) {
        let protocol = caps.get(1).unwrap().as_str();
        let hostname = caps.get(2).unwrap().as_str();
        let repo_path = caps.get(3).unwrap().as_str();
        let git_ref = caps.get(4).unwrap().as_str().to_string();
        let subpath = caps.get(5).unwrap().as_str().to_string();

        if hostname != "github.com" && !repo_path.is_empty() {
            let clean_repo_path = repo_path.trim_end_matches(".git");
            // Extract owner and repo from the repo_path (could be group/subgroup/repo)
            let parts: Vec<&str> = clean_repo_path.split('/').collect();
            let (owner, repo) = if parts.len() >= 2 {
                (
                    Some(parts[..parts.len() - 1].join("/")),
                    Some(parts[parts.len() - 1].to_string()),
                )
            } else {
                (None, None)
            };
            return ParsedSource {
                source_type: "gitlab".to_string(),
                url: format!("{}://{}/{}.git", protocol, hostname, clean_repo_path),
                owner,
                repo,
                subpath: Some(subpath),
                git_ref: Some(git_ref),
                skill_name: None,
                local_path: None,
            };
        }
    }

    // 6a. GitLab URL with branch only: https://gitlab.com/owner/repo/-/tree/branch
    let gitlab_tree_re = Regex::new(r"^(https?)://([^/]+)/(.+?)/-/tree/([^/]+)$").unwrap();
    if let Some(caps) = gitlab_tree_re.captures(input) {
        let protocol = caps.get(1).unwrap().as_str();
        let hostname = caps.get(2).unwrap().as_str();
        let repo_path = caps.get(3).unwrap().as_str();
        let git_ref = caps.get(4).unwrap().as_str().to_string();

        if hostname != "github.com" && !repo_path.is_empty() {
            let clean_repo_path = repo_path.trim_end_matches(".git");
            let parts: Vec<&str> = clean_repo_path.split('/').collect();
            let (owner, repo) = if parts.len() >= 2 {
                (
                    Some(parts[..parts.len() - 1].join("/")),
                    Some(parts[parts.len() - 1].to_string()),
                )
            } else {
                (None, None)
            };
            return ParsedSource {
                source_type: "gitlab".to_string(),
                url: format!("{}://{}/{}.git", protocol, hostname, clean_repo_path),
                owner,
                repo,
                subpath: None,
                git_ref: Some(git_ref),
                skill_name: None,
                local_path: None,
            };
        }
    }

    // 6b. GitLab.com basic URL: gitlab.com/owner/repo or gitlab.com/group/subgroup/repo
    let gitlab_repo_re = Regex::new(r"gitlab\.com/(.+?)(?:\.git)?/?$").unwrap();
    if let Some(caps) = gitlab_repo_re.captures(input) {
        let repo_path = caps.get(1).unwrap().as_str();
        // Must have at least owner/repo (one slash)
        if repo_path.contains('/') {
            let parts: Vec<&str> = repo_path.split('/').collect();
            let owner = parts[..parts.len() - 1].join("/");
            let repo = parts[parts.len() - 1].to_string();
            return ParsedSource {
                source_type: "gitlab".to_string(),
                url: format!("https://gitlab.com/{}.git", repo_path),
                owner: Some(owner),
                repo: Some(repo),
                subpath: None,
                git_ref: None,
                skill_name: None,
                local_path: None,
            };
        }
    }

    // 7. GitHub shorthand with @skill: owner/repo@skill-name
    //    Exclude paths that start with . or / and those containing ':'
    let at_skill_re = Regex::new(r"^([^/]+)/([^/@]+)@(.+)$").unwrap();
    if let Some(caps) = at_skill_re.captures(input) {
        if !input.contains(':') && !input.starts_with('.') && !input.starts_with('/') {
            let owner = caps.get(1).unwrap().as_str().to_string();
            let repo = caps.get(2).unwrap().as_str().to_string();
            let skill_filter = caps.get(3).unwrap().as_str().to_string();
            return ParsedSource {
                source_type: "github".to_string(),
                url: format!("https://github.com/{}/{}.git", owner, repo),
                owner: Some(owner),
                repo: Some(repo),
                subpath: None,
                git_ref: None,
                skill_name: Some(skill_filter),
                local_path: None,
            };
        }
    }

    // 8 & 9. GitHub shorthand: owner/repo or owner/repo/path/to/skill
    let shorthand_re = Regex::new(r"^([^/]+)/([^/]+)(?:/(.+))?$").unwrap();
    if let Some(caps) = shorthand_re.captures(input) {
        if !input.contains(':') && !input.starts_with('.') && !input.starts_with('/') {
            let owner = caps.get(1).unwrap().as_str().to_string();
            let repo = caps.get(2).unwrap().as_str().to_string();
            let subpath = caps.get(3).map(|m| m.as_str().to_string());
            return ParsedSource {
                source_type: "github".to_string(),
                url: format!("https://github.com/{}/{}.git", owner, repo),
                owner: Some(owner),
                repo: Some(repo),
                subpath,
                git_ref: None,
                skill_name: None,
                local_path: None,
            };
        }
    }

    // 10. Well-known URL (HTTP(S) non-GitHub/GitLab, not ending in .git)
    if is_well_known_url(input) {
        return ParsedSource {
            source_type: "well-known".to_string(),
            url: input.to_string(),
            owner: None,
            repo: None,
            subpath: None,
            git_ref: None,
            skill_name: None,
            local_path: None,
        };
    }

    // 11. Fallback: treat as direct git URL
    ParsedSource {
        source_type: "git".to_string(),
        url: input.to_string(),
        owner: None,
        repo: None,
        subpath: None,
        git_ref: None,
        skill_name: None,
        local_path: None,
    }
}

/// Extract owner/repo string from a parsed source for lockfile tracking.
/// Returns `None` for local paths or unparseable sources.
pub fn get_owner_repo(parsed: &ParsedSource) -> Option<String> {
    if parsed.source_type == "local" {
        return None;
    }

    if !parsed.url.starts_with("http://") && !parsed.url.starts_with("https://") {
        return None;
    }

    match url::Url::parse(&parsed.url) {
        Ok(u) => {
            let path = u.path().trim_start_matches('/');
            let path = path.trim_end_matches(".git");
            if path.contains('/') {
                Some(path.to_string())
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_local_absolute_path() {
        let result = parse_source("/home/user/skills");
        assert_eq!(result.source_type, "local");
        assert_eq!(result.url, "/home/user/skills");
        assert!(result.local_path.is_some());
    }

    #[test]
    fn test_local_relative_path() {
        let result = parse_source("./my-skills");
        assert_eq!(result.source_type, "local");
        assert!(result.local_path.is_some());
    }

    #[test]
    fn test_local_parent_relative_path() {
        let result = parse_source("../my-skills");
        assert_eq!(result.source_type, "local");
        assert!(result.local_path.is_some());
    }

    #[test]
    fn test_local_dot() {
        let result = parse_source(".");
        assert_eq!(result.source_type, "local");
    }

    #[test]
    fn test_github_tree_with_path() {
        let result = parse_source("https://github.com/owner/repo/tree/main/path/to/skill");
        assert_eq!(result.source_type, "github");
        assert_eq!(result.url, "https://github.com/owner/repo.git");
        assert_eq!(result.owner.as_deref(), Some("owner"));
        assert_eq!(result.repo.as_deref(), Some("repo"));
        assert_eq!(result.git_ref.as_deref(), Some("main"));
        assert_eq!(result.subpath.as_deref(), Some("path/to/skill"));
    }

    #[test]
    fn test_github_tree_branch_only() {
        let result = parse_source("https://github.com/owner/repo/tree/develop");
        assert_eq!(result.source_type, "github");
        assert_eq!(result.url, "https://github.com/owner/repo.git");
        assert_eq!(result.git_ref.as_deref(), Some("develop"));
        assert!(result.subpath.is_none());
    }

    #[test]
    fn test_github_basic_url() {
        let result = parse_source("https://github.com/owner/repo");
        assert_eq!(result.source_type, "github");
        assert_eq!(result.url, "https://github.com/owner/repo.git");
        assert_eq!(result.owner.as_deref(), Some("owner"));
        assert_eq!(result.repo.as_deref(), Some("repo"));
    }

    #[test]
    fn test_github_basic_url_with_git_suffix() {
        let result = parse_source("https://github.com/owner/repo.git");
        assert_eq!(result.source_type, "github");
        assert_eq!(result.url, "https://github.com/owner/repo.git");
        assert_eq!(result.repo.as_deref(), Some("repo"));
    }

    #[test]
    fn test_gitlab_tree_with_path() {
        let result = parse_source("https://gitlab.com/group/repo/-/tree/main/skills/my-skill");
        assert_eq!(result.source_type, "gitlab");
        assert_eq!(result.url, "https://gitlab.com/group/repo.git");
        assert_eq!(result.git_ref.as_deref(), Some("main"));
        assert_eq!(result.subpath.as_deref(), Some("skills/my-skill"));
    }

    #[test]
    fn test_gitlab_basic() {
        let result = parse_source("https://gitlab.com/group/repo");
        assert_eq!(result.source_type, "gitlab");
        assert_eq!(result.url, "https://gitlab.com/group/repo.git");
    }

    #[test]
    fn test_gitlab_subgroups() {
        let result = parse_source("https://gitlab.com/group/subgroup/repo");
        assert_eq!(result.source_type, "gitlab");
        assert_eq!(result.url, "https://gitlab.com/group/subgroup/repo.git");
        assert_eq!(result.owner.as_deref(), Some("group/subgroup"));
        assert_eq!(result.repo.as_deref(), Some("repo"));
    }

    #[test]
    fn test_github_shorthand_with_skill() {
        let result = parse_source("owner/repo@my-skill");
        assert_eq!(result.source_type, "github");
        assert_eq!(result.url, "https://github.com/owner/repo.git");
        assert_eq!(result.owner.as_deref(), Some("owner"));
        assert_eq!(result.repo.as_deref(), Some("repo"));
        assert_eq!(result.skill_name.as_deref(), Some("my-skill"));
    }

    #[test]
    fn test_github_shorthand_with_subpath() {
        let result = parse_source("owner/repo/path/to/skill");
        assert_eq!(result.source_type, "github");
        assert_eq!(result.url, "https://github.com/owner/repo.git");
        assert_eq!(result.subpath.as_deref(), Some("path/to/skill"));
    }

    #[test]
    fn test_github_shorthand_basic() {
        let result = parse_source("owner/repo");
        assert_eq!(result.source_type, "github");
        assert_eq!(result.url, "https://github.com/owner/repo.git");
        assert_eq!(result.owner.as_deref(), Some("owner"));
        assert_eq!(result.repo.as_deref(), Some("repo"));
    }

    #[test]
    fn test_well_known_url() {
        let result = parse_source("https://example.com/skills");
        assert_eq!(result.source_type, "well-known");
        assert_eq!(result.url, "https://example.com/skills");
    }

    #[test]
    fn test_git_fallback() {
        let result = parse_source("git@github.com:owner/repo.git");
        assert_eq!(result.source_type, "git");
        assert_eq!(result.url, "git@github.com:owner/repo.git");
    }

    #[test]
    fn test_source_alias() {
        let result = parse_source("coinbase/agentWallet");
        assert_eq!(result.source_type, "github");
        assert!(result.url.contains("agentic-wallet-skills"));
    }

    #[test]
    fn test_get_owner_repo_github() {
        let parsed = parse_source("https://github.com/owner/repo");
        let result = get_owner_repo(&parsed);
        assert_eq!(result, Some("owner/repo".to_string()));
    }

    #[test]
    fn test_get_owner_repo_local() {
        let parsed = parse_source("/local/path");
        let result = get_owner_repo(&parsed);
        assert_eq!(result, None);
    }
}
