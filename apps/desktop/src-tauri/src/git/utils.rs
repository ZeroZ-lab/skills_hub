use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

/// Compute a SHA-256 content hash of a directory's files.
///
/// Walks all files recursively (sorted by path for determinism),
/// and hashes their contents together. Skips `.git` directories.
pub fn compute_content_hash(dir: &Path) -> Result<String, std::io::Error> {
    let mut hasher = Sha256::new();
    let mut file_paths: Vec<PathBuf> = Vec::new();

    collect_file_paths(dir, &mut file_paths)?;
    file_paths.sort();

    for path in &file_paths {
        // Include the relative path in the hash for structural integrity
        if let Ok(relative) = path.strip_prefix(dir) {
            hasher.update(relative.to_string_lossy().as_bytes());
        }
        let content = std::fs::read(path)?;
        hasher.update(&content);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

/// Recursively collect all file paths in a directory, skipping `.git`.
fn collect_file_paths(dir: &Path, paths: &mut Vec<PathBuf>) -> Result<(), std::io::Error> {
    if !dir.is_dir() {
        return Ok(());
    }

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let file_name = entry.file_name();

        // Skip .git directory
        if file_name == ".git" {
            continue;
        }

        if path.is_dir() {
            collect_file_paths(&path, paths)?;
        } else {
            paths.push(path);
        }
    }

    Ok(())
}

/// Get the base cache directory for Skills Manager.
///
/// Returns `~/.skills-manager/cache/`, creating it if it doesn't exist.
pub fn get_cache_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let cache_dir = home.join(".skills-manager").join("cache");
    if !cache_dir.exists() {
        let _ = std::fs::create_dir_all(&cache_dir);
    }
    cache_dir
}

/// Get a deterministic cache path for a given URL.
///
/// The path is derived by hashing the URL to avoid filesystem issues
/// with special characters, while also including a human-readable prefix.
pub fn get_cache_path(url: &str) -> PathBuf {
    let cache_dir = get_cache_dir();

    // Create a hash of the URL for uniqueness
    let mut hasher = Sha256::new();
    hasher.update(url.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    let short_hash = &hash[..12];

    // Extract a human-readable name from the URL
    let readable = url
        .trim_end_matches(".git")
        .rsplit('/')
        .take(2)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("_");

    // Sanitize the readable part (remove non-alphanumeric except - and _)
    let sanitized: String = readable
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();

    cache_dir.join(format!("{}_{}", sanitized, short_hash))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_cache_dir() {
        let dir = get_cache_dir();
        assert!(dir.to_string_lossy().contains(".skills-manager"));
        assert!(dir.to_string_lossy().ends_with("cache"));
    }

    #[test]
    fn test_get_cache_path_deterministic() {
        let url = "https://github.com/owner/repo.git";
        let path1 = get_cache_path(url);
        let path2 = get_cache_path(url);
        assert_eq!(path1, path2);
    }

    #[test]
    fn test_get_cache_path_different_urls() {
        let path1 = get_cache_path("https://github.com/owner/repo1.git");
        let path2 = get_cache_path("https://github.com/owner/repo2.git");
        assert_ne!(path1, path2);
    }

    #[test]
    fn test_get_cache_path_readable() {
        let path = get_cache_path("https://github.com/owner/my-repo.git");
        let name = path.file_name().unwrap().to_string_lossy();
        assert!(name.contains("owner_my-repo"));
    }

    #[test]
    fn test_compute_content_hash() {
        let temp = tempfile::tempdir().unwrap();
        let file_path = temp.path().join("test.txt");
        std::fs::write(&file_path, "hello world").unwrap();

        let hash = compute_content_hash(temp.path()).unwrap();
        assert!(!hash.is_empty());
        assert_eq!(hash.len(), 64); // SHA-256 hex string

        // Should be deterministic
        let hash2 = compute_content_hash(temp.path()).unwrap();
        assert_eq!(hash, hash2);
    }
}
