use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

use crate::error::CommandError;

/// Global lock file stored at `~/.agents/.skill-lock.json`.
///
/// Tracks all installed skills across all agents with v3 format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalLockFile {
    pub version: u32,
    pub skills: BTreeMap<String, GlobalSkillEntry>,
}

impl Default for GlobalLockFile {
    fn default() -> Self {
        Self {
            version: 3,
            skills: BTreeMap::new(),
        }
    }
}

/// A single skill entry in the global lock file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSkillEntry {
    pub source: LockSource,
    #[serde(rename = "canonicalPath")]
    pub canonical_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub tags: Vec<String>,
    #[serde(rename = "treeSha")]
    pub tree_sha: Option<String>,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
    pub installs: Vec<LockInstallRecord>,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// Source information stored in lock files.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockSource {
    #[serde(rename = "type")]
    pub source_type: String,
    pub url: String,
    pub subpath: Option<String>,
    #[serde(rename = "ref")]
    pub git_ref: Option<String>,
    pub provider: Option<String>,
}

/// Record of a skill installation to a specific agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockInstallRecord {
    pub agent: String,
    pub scope: String,
    pub mode: String,
    #[serde(rename = "installedPath")]
    pub installed_path: String,
    #[serde(rename = "installedAt")]
    pub installed_at: String,
}

/// Get the path to the global agents directory (`~/.agents/`).
fn get_agents_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".agents")
}

/// Get the path to the global lock file (`~/.agents/.skill-lock.json`).
fn get_global_lock_path() -> PathBuf {
    get_agents_dir().join(".skill-lock.json")
}

/// Load the global lock file. Returns a default empty lock if the file does not exist.
pub fn load_global_lock() -> GlobalLockFile {
    let path = get_global_lock_path();
    if !path.exists() {
        return GlobalLockFile::default();
    }
    match std::fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => GlobalLockFile::default(),
    }
}

/// Save the global lock file atomically using tempfile + rename.
///
/// Creates `~/.agents/` if it does not exist.
/// Serializes with sorted keys (BTreeMap) for diff-friendly output.
pub fn save_global_lock(lock: &GlobalLockFile) -> Result<(), CommandError> {
    let agents_dir = get_agents_dir();
    std::fs::create_dir_all(&agents_dir)?;

    let lock_path = get_global_lock_path();

    let json = serde_json::to_string_pretty(lock)?;

    // Atomic write: write to a temp file in the same directory, then rename
    let tmp_path = agents_dir.join(".skill-lock.json.tmp");
    std::fs::write(&tmp_path, &json)?;
    std::fs::rename(&tmp_path, &lock_path)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_global_lock() {
        let lock = GlobalLockFile::default();
        assert_eq!(lock.version, 3);
        assert!(lock.skills.is_empty());
    }

    #[test]
    fn test_global_lock_roundtrip() {
        let mut lock = GlobalLockFile::default();
        lock.skills.insert(
            "test-skill".to_string(),
            GlobalSkillEntry {
                source: LockSource {
                    source_type: "github".to_string(),
                    url: "https://github.com/owner/repo.git".to_string(),
                    subpath: None,
                    git_ref: Some("main".to_string()),
                    provider: Some("github".to_string()),
                },
                canonical_path: "/path/to/canonical".to_string(),
                description: Some("desc".to_string()),
                version: Some("1.0.0".to_string()),
                author: Some("author".to_string()),
                tags: vec!["tag1".to_string()],
                tree_sha: Some("abc123".to_string()),
                content_hash: "sha256hex".to_string(),
                installs: vec![LockInstallRecord {
                    agent: "claude".to_string(),
                    scope: "global".to_string(),
                    mode: "symlink".to_string(),
                    installed_path: "/path".to_string(),
                    installed_at: "2024-01-01T00:00:00Z".to_string(),
                }],
                updated_at: "2024-01-01T00:00:00Z".to_string(),
            },
        );

        let json = serde_json::to_string_pretty(&lock).unwrap();
        let deserialized: GlobalLockFile = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.version, 3);
        assert!(deserialized.skills.contains_key("test-skill"));

        let entry = &deserialized.skills["test-skill"];
        assert_eq!(entry.source.source_type, "github");
        assert_eq!(entry.canonical_path, "/path/to/canonical");
        assert_eq!(entry.content_hash, "sha256hex");
        assert_eq!(entry.installs.len(), 1);
        assert_eq!(entry.installs[0].agent, "claude");
    }

    #[test]
    fn test_global_lock_json_uses_camel_case() {
        let lock = GlobalLockFile::default();
        let mut skills = BTreeMap::new();
        skills.insert(
            "test".to_string(),
            GlobalSkillEntry {
                source: LockSource {
                    source_type: "local".to_string(),
                    url: "/tmp".to_string(),
                    subpath: None,
                    git_ref: None,
                    provider: None,
                },
                canonical_path: "/tmp/test".to_string(),
                description: None,
                version: None,
                author: None,
                tags: vec![],
                tree_sha: None,
                content_hash: "hash".to_string(),
                installs: vec![],
                updated_at: "2024-01-01T00:00:00Z".to_string(),
            },
        );
        let lock = GlobalLockFile { version: 3, skills };
        let json = serde_json::to_string(&lock).unwrap();
        assert!(json.contains("canonicalPath"));
        assert!(json.contains("contentHash"));
        assert!(json.contains("updatedAt"));
        assert!(json.contains("treeSha"));
    }
}
