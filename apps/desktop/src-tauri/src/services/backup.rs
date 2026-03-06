use serde::{Deserialize, Serialize};

use crate::commands::system::{ImportResult, PendingMCPSecretInput};
use crate::config::app_config::{self, AppConfigData};
use crate::error::CommandError;
use crate::lock::global::{self, GlobalLockFile};
use crate::mcp_engine::registry::{self, MCPRegistryFile};
use crate::services::logger;

const REDACTED: &str = "***REDACTED***";

/// The backup file envelope.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct BackupEnvelope {
    version: u32,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "appConfig")]
    app_config: AppConfigData,
    #[serde(rename = "globalLock")]
    global_lock: GlobalLockFile,
    #[serde(rename = "mcpRegistry")]
    mcp_registry: MCPRegistryFile,
}

/// Redact environment variable values in MCP server configs.
fn redact_mcp_env(registry: &mut MCPRegistryFile) {
    for server in registry.servers.values_mut() {
        if let Some(env_obj) = server.config.get_mut("env") {
            if let Some(map) = env_obj.as_object_mut() {
                for value in map.values_mut() {
                    *value = serde_json::Value::String(REDACTED.to_string());
                }
            }
        }
    }
}

/// Create a full backup of the application state.
///
/// Writes a JSON file containing version, timestamp, app config,
/// global lock, and MCP registry.
///
/// # Arguments
/// * `path` - Destination file path for the backup.
/// * `include_secrets` - If `false`, MCP env vars are redacted.
///
/// # Returns
/// The absolute path the backup was written to.
pub fn create_backup(path: &str, include_secrets: bool) -> Result<String, CommandError> {
    let app_config = app_config::load_config();
    let global_lock = global::load_global_lock();
    let mut mcp_registry = registry::load_registry();

    if !include_secrets {
        redact_mcp_env(&mut mcp_registry);
    }

    let envelope = BackupEnvelope {
        version: 1,
        created_at: chrono::Utc::now().to_rfc3339(),
        app_config,
        global_lock,
        mcp_registry,
    };

    let json = serde_json::to_string_pretty(&envelope)?;

    // Atomic write.
    let dest = std::path::Path::new(path);
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp_path = dest.with_extension("tmp");
    std::fs::write(&tmp_path, &json)?;
    std::fs::rename(&tmp_path, dest)?;

    // Log the backup operation.
    let _ = logger::log_operation(
        "info",
        "backup",
        &format!("Created backup at {}", path),
        Some(&format!("include_secrets={}", include_secrets)),
    );

    Ok(path.to_string())
}

/// Restore application state from a backup file.
///
/// Merges the backup data into the current state:
/// - App config is fully replaced.
/// - Skills are merged (existing skills are not overwritten).
/// - MCP servers are merged by name (existing servers are not overwritten).
///
/// # Returns
/// An `ImportResult` with counts, pending secrets, and any errors.
pub fn restore_backup(path: &str) -> Result<ImportResult, CommandError> {
    let content = std::fs::read_to_string(path)?;
    let envelope: BackupEnvelope = serde_json::from_str(&content)?;

    let mut skills_imported: u32 = 0;
    let mut mcp_imported: u32 = 0;
    let mut pending_secrets: Vec<PendingMCPSecretInput> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    // --- Restore app config (full replace) ---
    if let Err(e) = app_config::save_config(&envelope.app_config) {
        errors.push(format!("Failed to restore app config: {}", e));
    }

    // --- Restore skills (merge, skip existing) ---
    let mut global_lock = global::load_global_lock();
    for (name, entry) in &envelope.global_lock.skills {
        if global_lock.skills.contains_key(name) {
            continue;
        }
        global_lock.skills.insert(name.clone(), entry.clone());
        skills_imported += 1;
    }
    if let Err(e) = global::save_global_lock(&global_lock) {
        errors.push(format!("Failed to save global lock: {}", e));
    }

    // --- Restore MCP servers (merge, skip existing by name) ---
    let mut mcp_reg = registry::load_registry();

    let existing_names: std::collections::HashSet<String> =
        mcp_reg.servers.values().map(|s| s.name.clone()).collect();

    for (id, server) in &envelope.mcp_registry.servers {
        if existing_names.contains(&server.name) {
            continue;
        }

        // Detect redacted env vars.
        let redacted_fields = detect_redacted_env(&server.config);
        if !redacted_fields.is_empty() {
            pending_secrets.push(PendingMCPSecretInput {
                server_name: server.name.clone(),
                fields: redacted_fields,
            });
        }

        mcp_reg.servers.insert(id.clone(), server.clone());
        mcp_imported += 1;
    }

    if let Err(e) = registry::save_registry(&mcp_reg) {
        errors.push(format!("Failed to save MCP registry: {}", e));
    }

    // Log the restore operation.
    let _ = logger::log_operation(
        "info",
        "restore",
        &format!(
            "Restored backup from {}: {} skills, {} MCP servers",
            path, skills_imported, mcp_imported
        ),
        None,
    );

    Ok(ImportResult {
        skills_imported,
        mcp_imported,
        pending_secrets,
        errors,
    })
}

/// Detect environment variable keys whose values are `"***REDACTED***"`.
fn detect_redacted_env(config: &serde_json::Value) -> Vec<String> {
    let mut fields = Vec::new();
    if let Some(env_obj) = config.get("env") {
        if let Some(map) = env_obj.as_object() {
            for (key, value) in map {
                if value.as_str() == Some(REDACTED) {
                    fields.push(key.clone());
                }
            }
        }
    }
    fields
}
