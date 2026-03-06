use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use crate::error::CommandError;

/// Project-level lock file stored at `<project_dir>/skills-lock.json`.
///
/// Tracks skills installed for a specific project with v1 format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectLockFile {
    pub version: u32,
    pub skills: BTreeMap<String, ProjectSkillEntry>,
}

impl Default for ProjectLockFile {
    fn default() -> Self {
        Self {
            version: 1,
            skills: BTreeMap::new(),
        }
    }
}

/// A single skill entry in the project lock file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSkillEntry {
    pub source: ProjectLockSource,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
    #[serde(rename = "installedAt")]
    pub installed_at: String,
}

/// Source information in a project lock file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectLockSource {
    #[serde(rename = "type")]
    pub source_type: String,
    pub url: String,
    pub subpath: Option<String>,
    #[serde(rename = "ref")]
    pub git_ref: Option<String>,
    pub provider: Option<String>,
}

/// Get the path to the project lock file.
fn get_project_lock_path(project_dir: &str) -> PathBuf {
    Path::new(project_dir).join("skills-lock.json")
}

/// Load the project lock file. Returns a default empty lock if the file does not exist.
pub fn load_project_lock(project_dir: &str) -> ProjectLockFile {
    let path = get_project_lock_path(project_dir);
    if !path.exists() {
        return ProjectLockFile::default();
    }
    match std::fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => ProjectLockFile::default(),
    }
}

/// Save the project lock file atomically using tempfile + rename.
///
/// Serializes with sorted keys (BTreeMap) for diff-friendly output.
pub fn save_project_lock(project_dir: &str, lock: &ProjectLockFile) -> Result<(), CommandError> {
    let project_path = Path::new(project_dir);
    if !project_path.exists() {
        std::fs::create_dir_all(project_path)?;
    }

    let lock_path = get_project_lock_path(project_dir);
    let json = serde_json::to_string_pretty(lock)?;

    // Atomic write: write to temp file then rename
    let tmp_path = project_path.join("skills-lock.json.tmp");
    std::fs::write(&tmp_path, &json)?;
    std::fs::rename(&tmp_path, &lock_path)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_project_lock() {
        let lock = ProjectLockFile::default();
        assert_eq!(lock.version, 1);
        assert!(lock.skills.is_empty());
    }

    #[test]
    fn test_project_lock_roundtrip() {
        let mut lock = ProjectLockFile::default();
        lock.skills.insert(
            "test-skill".to_string(),
            ProjectSkillEntry {
                source: ProjectLockSource {
                    source_type: "github".to_string(),
                    url: "https://github.com/owner/repo.git".to_string(),
                    subpath: None,
                    git_ref: Some("main".to_string()),
                    provider: Some("github".to_string()),
                },
                content_hash: "sha256hex".to_string(),
                installed_at: "2024-01-01T00:00:00Z".to_string(),
            },
        );

        let json = serde_json::to_string_pretty(&lock).unwrap();
        let deserialized: ProjectLockFile = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.version, 1);
        assert!(deserialized.skills.contains_key("test-skill"));

        let entry = &deserialized.skills["test-skill"];
        assert_eq!(entry.content_hash, "sha256hex");
    }

    #[test]
    fn test_project_lock_json_uses_camel_case() {
        let mut skills = BTreeMap::new();
        skills.insert(
            "test".to_string(),
            ProjectSkillEntry {
                source: ProjectLockSource {
                    source_type: "local".to_string(),
                    url: "/tmp".to_string(),
                    subpath: None,
                    git_ref: None,
                    provider: None,
                },
                content_hash: "hash".to_string(),
                installed_at: "2024-01-01T00:00:00Z".to_string(),
            },
        );
        let lock = ProjectLockFile { version: 1, skills };
        let json = serde_json::to_string(&lock).unwrap();
        assert!(json.contains("contentHash"));
        assert!(json.contains("installedAt"));
    }
}
