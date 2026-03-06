use serde::{Deserialize, Serialize};

use crate::commands::system::{ImportResult, PendingMCPSecretInput};
use crate::config::app_config::{self, AppConfigData};
use crate::error::CommandError;
use crate::lock::global::{self, GlobalLockFile};
use crate::mcp_engine::registry::{self, MCPRegistryFile};
use crate::services::logger;

/// The unified export envelope. Serialized to JSON or YAML.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ExportEnvelope {
    #[serde(rename = "appConfig")]
    app_config: AppConfigData,
    #[serde(rename = "globalLock")]
    global_lock: GlobalLockFile,
    #[serde(rename = "mcpRegistry")]
    mcp_registry: MCPRegistryFile,
}

const REDACTED: &str = "***REDACTED***";

/// Redact environment variable values in MCP server configs.
///
/// For each server whose config contains an `"env"` object, every value
/// in that object is replaced with `"***REDACTED***"`.
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

/// Export the full application configuration to a file.
///
/// # Arguments
/// * `format` - Output format: `"json"` or `"yaml"`.
/// * `path` - Destination file path.
/// * `include_secrets` - If `false`, MCP env vars are redacted.
///
/// # Returns
/// The absolute path the file was written to.
pub fn export_config(
    format: &str,
    path: &str,
    include_secrets: bool,
) -> Result<String, CommandError> {
    let app_config = app_config::load_config();
    let global_lock = global::load_global_lock();
    let mut mcp_registry = registry::load_registry();

    if !include_secrets {
        redact_mcp_env(&mut mcp_registry);
    }

    let envelope = ExportEnvelope {
        app_config,
        global_lock,
        mcp_registry,
    };

    let content = match format {
        "yaml" => serde_yaml::to_string(&envelope).map_err(|e| {
            CommandError::InternalError(format!("YAML serialization failed: {}", e))
        })?,
        _ => serde_json::to_string_pretty(&envelope)?,
    };

    // Atomic write: tempfile in the same directory, then rename.
    let dest = std::path::Path::new(path);
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp_path = dest.with_extension("tmp");
    std::fs::write(&tmp_path, &content)?;
    std::fs::rename(&tmp_path, dest)?;

    // Log the export operation.
    let _ = logger::log_operation(
        "info",
        "export",
        &format!("Exported configuration to {}", path),
        Some(&format!(
            "format={}, include_secrets={}",
            format, include_secrets
        )),
    );

    Ok(path.to_string())
}

/// Import configuration from a file.
///
/// Auto-detects JSON or YAML by file extension (`.yaml` / `.yml` → YAML, otherwise JSON).
/// Skills and MCP servers that already exist (by name) are skipped.
/// Redacted env vars are detected and reported as `PendingMCPSecretInput`.
///
/// # Returns
/// An `ImportResult` with counts, pending secrets, and any per-item errors.
pub fn import_config(path: &str) -> Result<ImportResult, CommandError> {
    let content = std::fs::read_to_string(path)?;

    // Detect format from extension.
    let lower_path = path.to_lowercase();
    let envelope: ExportEnvelope = if lower_path.ends_with(".yaml") || lower_path.ends_with(".yml")
    {
        serde_yaml::from_str(&content)
            .map_err(|e| CommandError::InternalError(format!("YAML parse error: {}", e)))?
    } else {
        serde_json::from_str(&content)?
    };

    let mut skills_imported: u32 = 0;
    let mut mcp_imported: u32 = 0;
    let mut pending_secrets: Vec<PendingMCPSecretInput> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    // --- Import skills into global lock (skip existing by name) ---
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

    // --- Import MCP servers into registry (skip existing by name) ---
    let mut mcp_reg = registry::load_registry();

    // Build a set of existing server names.
    let existing_names: std::collections::HashSet<String> =
        mcp_reg.servers.values().map(|s| s.name.clone()).collect();

    for (id, server) in &envelope.mcp_registry.servers {
        if existing_names.contains(&server.name) {
            continue;
        }

        // Detect redacted env vars → pending secrets.
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

    // Log the import operation.
    let _ = logger::log_operation(
        "info",
        "import",
        &format!(
            "Imported configuration from {}: {} skills, {} MCP servers",
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
