use async_trait::async_trait;
use log::{debug, info, warn};
use std::path::{Path, PathBuf};

use crate::error::CommandError;
use crate::source::parser::ParsedSource;

use super::traits::{HostProvider, ResolvedSkill};

/// Local filesystem skill provider.
///
/// Handles skills that are referenced by local file system paths.
/// Checks for SKILL.md in the target directory and optionally creates
/// symlinks or copies the files.
pub struct LocalProvider;

impl LocalProvider {
    pub fn new() -> Self {
        Self
    }

    /// Recursively find all directories containing SKILL.md under the given root.
    fn find_skill_dirs(root: &Path) -> Vec<PathBuf> {
        let mut result = Vec::new();
        Self::find_skill_dirs_recursive(root, root, &mut result);
        result
    }

    fn find_skill_dirs_recursive(root: &Path, current: &Path, result: &mut Vec<PathBuf>) {
        // Check if current directory has SKILL.md
        let skill_md = current.join("SKILL.md");
        if skill_md.exists() && skill_md.is_file() {
            result.push(current.to_path_buf());
            // Don't recurse further into this directory - it is a skill
            return;
        }

        // Recurse into subdirectories
        if let Ok(entries) = std::fs::read_dir(current) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    // Skip hidden directories and common non-skill dirs
                    let name = entry.file_name();
                    let name_str = name.to_string_lossy();
                    if name_str.starts_with('.')
                        || name_str == "node_modules"
                        || name_str == "target"
                        || name_str == "__pycache__"
                    {
                        continue;
                    }
                    Self::find_skill_dirs_recursive(root, &path, result);
                }
            }
        }
    }
}

impl Default for LocalProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl HostProvider for LocalProvider {
    fn name(&self) -> &str {
        "local"
    }

    fn can_handle(&self, parsed: &ParsedSource) -> bool {
        parsed.source_type == "local"
    }

    async fn resolve(&self, parsed: &ParsedSource) -> Result<Vec<ResolvedSkill>, CommandError> {
        let local_path = parsed.local_path.as_deref().unwrap_or(&parsed.url);
        let path = Path::new(local_path);

        if !path.exists() {
            return Err(CommandError::InvalidSource(format!(
                "Local path does not exist: {}",
                local_path
            )));
        }

        if !path.is_dir() {
            return Err(CommandError::InvalidSource(format!(
                "Local path is not a directory: {}",
                local_path
            )));
        }

        // Find all skill directories
        let skill_dirs = Self::find_skill_dirs(path);

        if skill_dirs.is_empty() {
            // Check if path itself is a valid skill directory (even without SKILL.md)
            warn!(
                "No SKILL.md found in local path: {}. Using directory as skill.",
                local_path
            );
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "unnamed-skill".to_string());
            return Ok(vec![ResolvedSkill {
                name,
                description: None,
                source_url: local_path.to_string(),
                source_type: "local".to_string(),
                provider: self.name().to_string(),
                subpath: None,
            }]);
        }

        let skills: Vec<ResolvedSkill> = skill_dirs
            .into_iter()
            .map(|dir| {
                let name = dir
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "unnamed-skill".to_string());
                let subpath = dir.strip_prefix(path).ok().and_then(|p| {
                    let s = p.to_string_lossy().to_string();
                    if s.is_empty() {
                        None
                    } else {
                        Some(s)
                    }
                });

                debug!("Found local skill: {} at {:?}", name, dir);

                ResolvedSkill {
                    name,
                    description: None,
                    source_url: dir.to_string_lossy().to_string(),
                    source_type: "local".to_string(),
                    provider: self.name().to_string(),
                    subpath,
                }
            })
            .collect();

        info!(
            "Resolved {} local skill(s) from {}",
            skills.len(),
            local_path
        );
        Ok(skills)
    }

    async fn fetch(&self, resolved: &ResolvedSkill, target_dir: &Path) -> Result<(), CommandError> {
        let source_path = Path::new(&resolved.source_url);

        if !source_path.exists() {
            return Err(CommandError::ProviderError(format!(
                "Source path no longer exists: {}",
                resolved.source_url
            )));
        }

        info!(
            "Linking/copying local skill '{}' from {} to {}",
            resolved.name,
            source_path.display(),
            target_dir.display()
        );

        // Try to create a symlink first (preferred for local development)
        #[cfg(unix)]
        {
            if !target_dir.exists() {
                // Ensure parent directory exists
                if let Some(parent) = target_dir.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                match std::os::unix::fs::symlink(source_path, target_dir) {
                    Ok(()) => {
                        info!(
                            "Created symlink: {} -> {}",
                            target_dir.display(),
                            source_path.display()
                        );
                        return Ok(());
                    }
                    Err(e) => {
                        warn!("Failed to create symlink, falling back to copy: {}", e);
                    }
                }
            }
        }

        // Fallback: copy the directory
        copy_dir_recursive(source_path, target_dir)?;

        info!(
            "Successfully copied local skill '{}' to {}",
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

        // Skip hidden directories
        let name = file_name.to_string_lossy();
        if name.starts_with('.') {
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
