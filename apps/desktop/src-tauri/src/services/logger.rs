use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;

use crate::commands::system::LogEntry;
use crate::config::app_config::get_config_dir;
use crate::error::CommandError;

/// Get the logs directory path (`~/.skills-manager/logs/`).
fn get_log_dir() -> PathBuf {
    get_config_dir().join("logs")
}

/// Get the path to the operations log file.
fn get_log_file_path() -> PathBuf {
    get_log_dir().join("operations.log")
}

/// Ensure the log directory exists, creating it if necessary.
pub fn ensure_log_dir() -> Result<(), CommandError> {
    let dir = get_log_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(())
}

/// Append a single operation log entry to the log file.
///
/// Each entry is written as a single JSON line (JSONL format).
///
/// # Arguments
/// * `level` - Log level: "info", "warn", or "error"
/// * `action` - Operation type, e.g. "install_skill", "remove_skill", "import", "export", etc.
/// * `message` - Human-readable description of the operation
/// * `details` - Optional additional details (e.g. error messages, file paths)
pub fn log_operation(
    level: &str,
    action: &str,
    message: &str,
    details: Option<&str>,
) -> Result<(), CommandError> {
    ensure_log_dir()?;

    let entry = LogEntry {
        timestamp: chrono::Utc::now().to_rfc3339(),
        level: level.to_string(),
        action: action.to_string(),
        message: message.to_string(),
        details: details.map(|d| d.to_string()),
    };

    let json_line = serde_json::to_string(&entry)?;

    let log_path = get_log_file_path();
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)?;

    writeln!(file, "{}", json_line)?;

    Ok(())
}

/// Read log entries from the log file with optional filtering and pagination.
///
/// # Arguments
/// * `level` - Optional minimum level filter. If provided, only entries at or above this level
///   are returned. Levels: "error" > "warn" > "info".
/// * `limit` - Optional maximum number of entries to return (defaults to 100).
/// * `offset` - Optional number of (filtered) entries to skip (defaults to 0).
///
/// # Returns
/// A tuple of `(entries, total_filtered_count)`.
pub fn get_logs(
    level: Option<&str>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<(Vec<LogEntry>, u32), CommandError> {
    let log_path = get_log_file_path();

    if !log_path.exists() {
        return Ok((vec![], 0));
    }

    let file = fs::File::open(&log_path)?;
    let reader = BufReader::new(file);

    // Parse all valid log lines.
    let mut all_entries: Vec<LogEntry> = Vec::new();
    for line in reader.lines() {
        let line = line?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(entry) = serde_json::from_str::<LogEntry>(trimmed) {
            all_entries.push(entry);
        }
    }

    // Sort by timestamp descending (most recent first).
    all_entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    // Apply level filter.
    let filtered: Vec<LogEntry> = if let Some(level_filter) = level {
        let min_severity = level_severity(level_filter);
        all_entries
            .into_iter()
            .filter(|e| level_severity(&e.level) >= min_severity)
            .collect()
    } else {
        all_entries
    };

    let total = filtered.len() as u32;

    // Apply pagination.
    let offset_val = offset.unwrap_or(0) as usize;
    let limit_val = limit.unwrap_or(100) as usize;

    let paginated: Vec<LogEntry> = filtered
        .into_iter()
        .skip(offset_val)
        .take(limit_val)
        .collect();

    Ok((paginated, total))
}

/// Map a level string to a numeric severity for filtering.
/// Higher number = more severe.
fn level_severity(level: &str) -> u8 {
    match level {
        "error" => 3,
        "warn" => 2,
        "info" => 1,
        _ => 0,
    }
}
