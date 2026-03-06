use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::agent::registry::get_agent;
use crate::error::CommandError;

use super::converter;
use super::registry::MCPRegistryServer;

/// Result of syncing a single server to a single agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatus {
    pub success: bool,
    pub synced_at: String,
    pub error: Option<String>,
}

/// Sync a single MCP server to a specific agent's config file.
///
/// 1. Read agent's config file
/// 2. Merge/update the MCP entry under the agent's config key
/// 3. Write back atomically
pub fn sync_server_to_agent(
    server: &MCPRegistryServer,
    server_name: &str,
    agent_type: &str,
) -> Result<SyncStatus, CommandError> {
    let now = chrono::Utc::now().to_rfc3339();

    let agent_entry = get_agent(agent_type).ok_or_else(|| {
        CommandError::MCPConfigError(format!("Agent '{agent_type}' not found in registry"))
    })?;
    let mapping = agent_entry.mcp_config.as_ref().ok_or_else(|| {
        CommandError::MCPConfigError(format!("Agent '{agent_type}' has no MCP config mapping"))
    })?;

    // Convert server to the agent's expected format.
    let agent_value = converter::to_agent_format(server, agent_type)?;

    match mapping.format.as_str() {
        "json" => {
            sync_json_agent(server_name, &agent_value, mapping)?;
        }
        "toml" => {
            sync_toml_agent(server_name, &agent_value, mapping)?;
        }
        other => {
            return Err(CommandError::MCPConfigError(format!(
                "Unsupported config format: {other}"
            )));
        }
    }

    Ok(SyncStatus {
        success: true,
        synced_at: now,
        error: None,
    })
}

/// Remove a server entry from a specific agent's config file.
pub fn remove_server_from_agent(server_name: &str, agent_type: &str) -> Result<(), CommandError> {
    let agent_entry = get_agent(agent_type).ok_or_else(|| {
        CommandError::MCPConfigError(format!("Agent '{agent_type}' not found in registry"))
    })?;
    let mapping = agent_entry.mcp_config.as_ref().ok_or_else(|| {
        CommandError::MCPConfigError(format!("Agent '{agent_type}' has no MCP config mapping"))
    })?;

    match mapping.format.as_str() {
        "json" => {
            remove_from_json_agent(server_name, mapping)?;
        }
        "toml" => {
            remove_from_toml_agent(server_name, mapping)?;
        }
        other => {
            return Err(CommandError::MCPConfigError(format!(
                "Unsupported config format: {other}"
            )));
        }
    }

    Ok(())
}

/// Sync all enabled servers from the registry to their respective agents.
/// Returns a vector of (server_id, agent_type, result) tuples.
pub fn sync_all_servers(
    registry: &super::registry::MCPRegistryFile,
) -> Vec<(String, String, Result<SyncStatus, CommandError>)> {
    let mut results = Vec::new();

    for (server_id, server) in &registry.servers {
        if !server.enabled {
            continue;
        }
        for (agent_type, binding) in &server.agents {
            if !binding.enabled {
                continue;
            }
            let result = sync_server_to_agent(server, &server.name, agent_type);
            results.push((server_id.clone(), agent_type.clone(), result));
        }
    }

    results
}

// ---------------------------------------------------------------------------
// JSON-based agent sync (Claude Code, Cursor, Gemini CLI, OpenCode)
// ---------------------------------------------------------------------------

fn sync_json_agent(
    server_name: &str,
    agent_value: &Value,
    mapping: &crate::agent::registry::MCPConfigMapping,
) -> Result<(), CommandError> {
    let path = std::path::Path::new(&mapping.config_path);

    // Read existing config or create empty object.
    let mut root = if path.exists() {
        let content = std::fs::read_to_string(path)?;
        if content.trim().is_empty() {
            json!({})
        } else {
            serde_json::from_str(&content).map_err(|e| {
                CommandError::MCPConfigError(format!(
                    "Failed to parse {}: {e}",
                    mapping.config_path
                ))
            })?
        }
    } else {
        json!({})
    };

    // Navigate/create the config key path (e.g. "mcpServers").
    let config_key = &mapping.config_key;
    ensure_json_key(&mut root, config_key);

    // Insert/update the server entry.
    if let Some(servers) = resolve_json_key_mut(&mut root, config_key) {
        if let Some(map) = servers.as_object_mut() {
            map.insert(server_name.to_string(), agent_value.clone());
        }
    }

    // Write back atomically.
    write_json_atomic(path, &root)?;

    Ok(())
}

fn remove_from_json_agent(
    server_name: &str,
    mapping: &crate::agent::registry::MCPConfigMapping,
) -> Result<(), CommandError> {
    let path = std::path::Path::new(&mapping.config_path);

    if !path.exists() {
        return Ok(());
    }

    let content = std::fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Ok(());
    }

    let mut root: Value = serde_json::from_str(&content).map_err(|e| {
        CommandError::MCPConfigError(format!("Failed to parse {}: {e}", mapping.config_path))
    })?;

    let config_key = &mapping.config_key;
    if let Some(servers) = resolve_json_key_mut(&mut root, config_key) {
        if let Some(map) = servers.as_object_mut() {
            map.remove(server_name);
        }
    }

    write_json_atomic(path, &root)?;

    Ok(())
}

// ---------------------------------------------------------------------------
// TOML-based agent sync (Codex)
// ---------------------------------------------------------------------------

fn sync_toml_agent(
    server_name: &str,
    agent_value: &Value,
    mapping: &crate::agent::registry::MCPConfigMapping,
) -> Result<(), CommandError> {
    let path = std::path::Path::new(&mapping.config_path);

    // Read existing TOML or create empty.
    let content = if path.exists() {
        std::fs::read_to_string(path)?
    } else {
        String::new()
    };

    let mut root: toml::Table = if content.trim().is_empty() {
        toml::Table::new()
    } else {
        toml::from_str(&content).map_err(|e| {
            CommandError::MCPConfigError(format!("Failed to parse {}: {e}", mapping.config_path))
        })?
    };

    // Ensure the mcp_servers table exists (Codex uses top-level "mcp_servers").
    if !root.contains_key("mcp_servers") {
        root.insert(
            "mcp_servers".to_string(),
            toml::Value::Table(toml::Table::new()),
        );
    }

    // Convert the JSON value to a TOML table for the server entry.
    let toml_entry = json_value_to_toml_table(agent_value)?;

    if let Some(toml::Value::Table(servers)) = root.get_mut("mcp_servers") {
        servers.insert(server_name.to_string(), toml::Value::Table(toml_entry));
    }

    let new_content = toml::to_string_pretty(&root)
        .map_err(|e| CommandError::MCPConfigError(format!("Failed to serialize TOML: {e}")))?;

    // Write atomically.
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, &new_content)?;
    std::fs::rename(&tmp, path)?;

    Ok(())
}

fn remove_from_toml_agent(
    server_name: &str,
    mapping: &crate::agent::registry::MCPConfigMapping,
) -> Result<(), CommandError> {
    let path = std::path::Path::new(&mapping.config_path);

    if !path.exists() {
        return Ok(());
    }

    let content = std::fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Ok(());
    }

    let mut root: toml::Table = toml::from_str(&content).map_err(|e| {
        CommandError::MCPConfigError(format!("Failed to parse {}: {e}", mapping.config_path))
    })?;

    // Remove from mcp_servers.
    if let Some(toml::Value::Table(servers)) = root.get_mut("mcp_servers") {
        servers.remove(server_name);
    }

    // Also check for old mcp.servers format.
    if let Some(toml::Value::Table(mcp)) = root.get_mut("mcp") {
        if let Some(toml::Value::Table(servers)) = mcp.get_mut("servers") {
            servers.remove(server_name);
        }
    }

    let new_content = toml::to_string_pretty(&root)
        .map_err(|e| CommandError::MCPConfigError(format!("Failed to serialize TOML: {e}")))?;

    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, &new_content)?;
    std::fs::rename(&tmp, path)?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Write a JSON value atomically to a file.
fn write_json_atomic(path: &std::path::Path, value: &Value) -> Result<(), CommandError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json_str = serde_json::to_string_pretty(value)?;
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, &json_str)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

/// Ensure a dot-separated key path exists in a JSON value, creating empty
/// objects as needed.
fn ensure_json_key(root: &mut Value, key: &str) {
    let parts: Vec<&str> = key.split('.').collect();
    let mut current = root;
    for part in parts {
        if !current.is_object() {
            *current = json!({});
        }
        if current.get(part).is_none() {
            current
                .as_object_mut()
                .unwrap()
                .insert(part.to_string(), json!({}));
        }
        current = current.get_mut(part).unwrap();
    }
}

/// Resolve a dot-separated key in a mutable JSON value.
fn resolve_json_key_mut<'a>(root: &'a mut Value, key: &str) -> Option<&'a mut Value> {
    let parts: Vec<&str> = key.split('.').collect();
    let mut current = root;
    for part in parts {
        current = current.get_mut(part)?;
    }
    Some(current)
}

/// Convert a JSON value to a TOML table (used for Codex server entries).
fn json_value_to_toml_table(value: &Value) -> Result<toml::Table, CommandError> {
    let obj = value.as_object().ok_or_else(|| {
        CommandError::MCPConfigError("Expected JSON object for TOML conversion".to_string())
    })?;

    let mut table = toml::Table::new();
    for (k, v) in obj {
        if let Some(tv) = json_to_toml_val(v) {
            table.insert(k.clone(), tv);
        }
    }
    Ok(table)
}

/// Convert a single JSON value to a TOML value. Returns None for null values.
fn json_to_toml_val(value: &Value) -> Option<toml::Value> {
    match value {
        Value::Null => None,
        Value::Bool(b) => Some(toml::Value::Boolean(*b)),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Some(toml::Value::Integer(i))
            } else if let Some(f) = n.as_f64() {
                Some(toml::Value::Float(f))
            } else {
                None
            }
        }
        Value::String(s) => Some(toml::Value::String(s.clone())),
        Value::Array(arr) => {
            let items: Vec<toml::Value> = arr.iter().filter_map(json_to_toml_val).collect();
            Some(toml::Value::Array(items))
        }
        Value::Object(obj) => {
            let mut table = toml::Table::new();
            for (k, v) in obj {
                if let Some(tv) = json_to_toml_val(v) {
                    table.insert(k.clone(), tv);
                }
            }
            Some(toml::Value::Table(table))
        }
    }
}
