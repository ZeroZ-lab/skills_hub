use log::{debug, info};
use std::path::Path;
use std::process::Command;

use crate::error::CommandError;

/// Clone a git repository to a target directory with optional shallow depth.
///
/// Uses `git clone` via `std::process::Command` for simplicity.
pub fn clone_repo(url: &str, target: &Path, depth: Option<u32>) -> Result<(), CommandError> {
    info!("Cloning {} into {}", url, target.display());

    let mut cmd = Command::new("git");
    cmd.arg("clone");

    if let Some(d) = depth {
        cmd.arg("--depth").arg(d.to_string());
    }

    cmd.arg(url).arg(target.as_os_str());

    let output = cmd
        .output()
        .map_err(|e| CommandError::ProviderError(format!("Failed to execute git clone: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CommandError::ProviderError(format!(
            "git clone failed for {}: {}",
            url,
            stderr.trim()
        )));
    }

    debug!("Successfully cloned {} into {}", url, target.display());
    Ok(())
}

/// Pull the latest changes in an existing git repository.
pub fn pull_repo(target: &Path) -> Result<(), CommandError> {
    info!("Pulling latest in {}", target.display());

    let output = Command::new("git")
        .arg("pull")
        .arg("--ff-only")
        .current_dir(target)
        .output()
        .map_err(|e| CommandError::ProviderError(format!("Failed to execute git pull: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CommandError::ProviderError(format!(
            "git pull failed in {}: {}",
            target.display(),
            stderr.trim()
        )));
    }

    debug!("Successfully pulled in {}", target.display());
    Ok(())
}

/// Clone a repository if it doesn't exist, or pull if it does.
///
/// Uses shallow clone (depth=1) for faster initial downloads.
pub fn clone_or_pull(url: &str, target: &Path) -> Result<(), CommandError> {
    if target.join(".git").exists() {
        debug!("Repository already exists at {}, pulling", target.display());
        pull_repo(target)
    } else {
        // Remove target dir if it exists but is not a git repo (stale state)
        if target.exists() {
            debug!(
                "Target {} exists but is not a git repo, removing",
                target.display()
            );
            std::fs::remove_dir_all(target).map_err(|e| {
                CommandError::ProviderError(format!(
                    "Failed to remove stale directory {}: {}",
                    target.display(),
                    e
                ))
            })?;
        }
        // Shallow clone for speed
        clone_repo(url, target, Some(1))
    }
}

/// Checkout a specific git ref (branch, tag, or commit).
pub fn checkout(target: &Path, git_ref: &str) -> Result<(), CommandError> {
    info!("Checking out '{}' in {}", git_ref, target.display());

    // First, fetch the ref in case it's not available locally (shallow clone)
    let fetch_output = Command::new("git")
        .args(["fetch", "origin", git_ref])
        .current_dir(target)
        .output()
        .map_err(|e| CommandError::ProviderError(format!("Failed to execute git fetch: {}", e)))?;

    if !fetch_output.status.success() {
        let stderr = String::from_utf8_lossy(&fetch_output.stderr);
        debug!(
            "git fetch origin {} failed (may be a tag or commit): {}",
            git_ref,
            stderr.trim()
        );
    }

    // Now checkout
    let output = Command::new("git")
        .args(["checkout", git_ref])
        .current_dir(target)
        .output()
        .map_err(|e| {
            CommandError::ProviderError(format!("Failed to execute git checkout: {}", e))
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(CommandError::ProviderError(format!(
            "git checkout '{}' failed in {}: {}",
            git_ref,
            target.display(),
            stderr.trim()
        )));
    }

    debug!(
        "Successfully checked out '{}' in {}",
        git_ref,
        target.display()
    );
    Ok(())
}
