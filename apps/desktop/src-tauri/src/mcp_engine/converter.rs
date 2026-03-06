use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::agent::registry::{get_agent, MCPConfigMapping};
use crate::error::CommandError;

use super::registry::MCPRegistryServer;

/// An imported server parsed from an agent's config file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedServer {
    pub name: String,
    pub server_type: String,
    pub config: Value,
}

// ---------------------------------------------------------------------------
// Internal → Agent format
// ---------------------------------------------------------------------------

/// Convert an internal MCPRegistryServer to the format expected by a given agent.
/// Returns a JSON value that represents the server entry in the agent's native format.
pub fn to_agent_format(
    server: &MCPRegistryServer,
    agent_type: &str,
) -> Result<Value, CommandError> {
    match agent_type {
        "codex" => to_codex_format(server),
        // Claude Code, Cursor, Gemini CLI, OpenCode, and any JSON-based agent
        // all share the same { command, args, env } / { url, headers } shape.
        _ => to_json_format(server),
    }
}

/// Standard JSON format used by Claude Code, Cursor, Gemini CLI, OpenCode, etc.
fn to_json_format(server: &MCPRegistryServer) -> Result<Value, CommandError> {
    let config = &server.config;
    let mut entry = serde_json::Map::new();

    let server_type = config
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or(&server.server_type);

    match server_type {
        "stdio" => {
            if let Some(cmd) = config.get("command") {
                entry.insert("command".to_string(), cmd.clone());
            }
            if let Some(args) = config.get("args") {
                entry.insert("args".to_string(), args.clone());
            }
            if let Some(env) = config.get("env") {
                if env.is_object() && !env.as_object().map(|o| o.is_empty()).unwrap_or(true) {
                    entry.insert("env".to_string(), env.clone());
                }
            }
        }
        "sse" | "streamable-http" | "http" => {
            if let Some(url) = config.get("url") {
                entry.insert("url".to_string(), url.clone());
            }
            if let Some(headers) = config.get("headers") {
                if headers.is_object() && !headers.as_object().map(|o| o.is_empty()).unwrap_or(true)
                {
                    entry.insert("headers".to_string(), headers.clone());
                }
            }
        }
        _ => {
            // Pass through all config keys as-is for unknown types.
            if let Some(obj) = config.as_object() {
                for (k, v) in obj {
                    entry.insert(k.clone(), v.clone());
                }
            }
        }
    }

    Ok(Value::Object(entry))
}

/// Codex uses TOML internally, but we produce a JSON representation of what will
/// become the TOML entry. The actual TOML serialization happens in `sync.rs` when
/// we write to the config file.
fn to_codex_format(server: &MCPRegistryServer) -> Result<Value, CommandError> {
    // Codex JSON shape is the same as the standard format.
    to_json_format(server)
}

// ---------------------------------------------------------------------------
// Agent format → Internal
// ---------------------------------------------------------------------------

/// Parse agent config file content and extract MCP server definitions.
/// Returns a list of `ImportedServer` values.
pub fn from_agent_format(
    content: &str,
    agent_type: &str,
) -> Result<Vec<ImportedServer>, CommandError> {
    let mapping = get_agent(agent_type).and_then(|a| a.mcp_config);

    let mapping = mapping.ok_or_else(|| {
        CommandError::MCPConfigError(format!("Agent '{agent_type}' has no MCP config mapping"))
    })?;

    match mapping.format.as_str() {
        "json" => from_json_agent_format(content, &mapping),
        "toml" => from_toml_agent_format(content, &mapping),
        other => Err(CommandError::MCPConfigError(format!(
            "Unsupported agent config format: {other}"
        ))),
    }
}

/// Parse JSON-based agent configs (Claude Code, Cursor, Gemini CLI, OpenCode).
fn from_json_agent_format(
    content: &str,
    mapping: &MCPConfigMapping,
) -> Result<Vec<ImportedServer>, CommandError> {
    let root: Value = serde_json::from_str(content)
        .map_err(|e| CommandError::MCPConfigError(format!("Failed to parse JSON config: {e}")))?;

    let servers_obj = resolve_json_key(&root, &mapping.config_key);
    let servers_obj = match servers_obj {
        Some(Value::Object(map)) => map.clone(),
        _ => return Ok(vec![]),
    };

    let mut result = Vec::new();
    for (name, spec) in &servers_obj {
        let server_type = infer_server_type(&spec);
        result.push(ImportedServer {
            name: name.clone(),
            server_type,
            config: spec.clone(),
        });
    }

    Ok(result)
}

/// Parse TOML-based agent configs (Codex).
fn from_toml_agent_format(
    content: &str,
    mapping: &MCPConfigMapping,
) -> Result<Vec<ImportedServer>, CommandError> {
    let root: toml::Table = toml::from_str(content)
        .map_err(|e| CommandError::MCPConfigError(format!("Failed to parse TOML config: {e}")))?;

    let mut result = Vec::new();

    // The config_key for Codex is "mcp.servers" — we also check "mcp_servers" as a fallback.
    let keys_to_try: Vec<Vec<&str>> =
        vec![mapping.config_key.split('.').collect(), vec!["mcp_servers"]];

    for key_path in &keys_to_try {
        let servers_table = resolve_toml_key(&root, key_path);
        if let Some(table) = servers_table {
            for (name, entry_val) in table {
                if let Some(entry_tbl) = entry_val.as_table() {
                    let config = toml_entry_to_json(entry_tbl);
                    let server_type = infer_server_type(&config);
                    result.push(ImportedServer {
                        name: name.clone(),
                        server_type,
                        config,
                    });
                }
            }
            if !result.is_empty() {
                break; // Found servers, no need to try other keys.
            }
        }
    }

    Ok(result)
}

// ---------------------------------------------------------------------------
// Agent config file I/O
// ---------------------------------------------------------------------------

/// Read the current MCP config from an agent's config file.
/// Returns the full file content as a parsed JSON Value, or an empty object
/// if the file doesn't exist.
pub fn read_agent_config(agent_type: &str) -> Result<Value, CommandError> {
    let mapping = get_agent(agent_type)
        .and_then(|a| a.mcp_config)
        .ok_or_else(|| {
            CommandError::MCPConfigError(format!("Agent '{agent_type}' has no MCP config mapping"))
        })?;

    let path = std::path::Path::new(&mapping.config_path);
    if !path.exists() {
        return match mapping.format.as_str() {
            "toml" => Ok(json!({})),
            _ => Ok(json!({})),
        };
    }

    let content = std::fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Ok(json!({}));
    }

    match mapping.format.as_str() {
        "json" => {
            let v: Value = serde_json::from_str(&content).map_err(|e| {
                CommandError::MCPConfigError(format!(
                    "Failed to parse {}: {e}",
                    mapping.config_path
                ))
            })?;
            Ok(v)
        }
        "toml" => {
            // Parse TOML into a generic JSON Value for uniform handling.
            let table: toml::Table = toml::from_str(&content).map_err(|e| {
                CommandError::MCPConfigError(format!(
                    "Failed to parse {}: {e}",
                    mapping.config_path
                ))
            })?;
            let v = toml_table_to_json(&table);
            Ok(v)
        }
        other => Err(CommandError::MCPConfigError(format!(
            "Unsupported config format: {other}"
        ))),
    }
}

/// Write the MCP config to an agent's config file. The `config` parameter is
/// the full file content to write (the caller is responsible for merging).
pub fn write_agent_config(agent_type: &str, config: &Value) -> Result<(), CommandError> {
    let mapping = get_agent(agent_type)
        .and_then(|a| a.mcp_config)
        .ok_or_else(|| {
            CommandError::MCPConfigError(format!("Agent '{agent_type}' has no MCP config mapping"))
        })?;

    let path = std::path::Path::new(&mapping.config_path);

    // Ensure parent directory exists.
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    match mapping.format.as_str() {
        "json" => {
            let json_str = serde_json::to_string_pretty(config)?;
            atomic_write(path, &json_str)?;
        }
        "toml" => {
            let toml_str = json_to_toml_string(config)?;
            atomic_write(path, &toml_str)?;
        }
        other => {
            return Err(CommandError::MCPConfigError(format!(
                "Unsupported config format: {other}"
            )));
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/// Atomic write: write to a temp file next to the target, then rename.
fn atomic_write(path: &std::path::Path, content: &str) -> Result<(), CommandError> {
    let parent = path.parent().unwrap_or(std::path::Path::new("."));
    let tmp = parent.join(format!(
        ".{}.tmp",
        path.file_name().unwrap_or_default().to_string_lossy()
    ));
    std::fs::write(&tmp, content)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

/// Resolve a dot-separated key path in a JSON value (e.g. "mcpServers").
fn resolve_json_key<'a>(root: &'a Value, key: &str) -> Option<&'a Value> {
    let parts: Vec<&str> = key.split('.').collect();
    let mut current = root;
    for part in parts {
        current = current.get(part)?;
    }
    Some(current)
}

/// Resolve a key path in a TOML table.
fn resolve_toml_key<'a>(root: &'a toml::Table, path: &[&str]) -> Option<&'a toml::Table> {
    let mut current = root;
    for part in path {
        let val = current.get(*part)?;
        current = val.as_table()?;
    }
    Some(current)
}

/// Infer server type from a config JSON value.
fn infer_server_type(config: &Value) -> String {
    if let Some(t) = config.get("type").and_then(|v| v.as_str()) {
        return t.to_string();
    }
    if config.get("command").is_some() {
        "stdio".to_string()
    } else if config.get("url").is_some() {
        "sse".to_string()
    } else {
        "stdio".to_string()
    }
}

/// Convert a TOML table entry (for a single MCP server) into a JSON value.
fn toml_entry_to_json(table: &toml::Table) -> Value {
    let mut map = serde_json::Map::new();
    for (k, v) in table {
        map.insert(k.clone(), toml_value_to_json(v));
    }
    Value::Object(map)
}

/// Recursively convert a TOML value to a JSON value.
fn toml_value_to_json(val: &toml::Value) -> Value {
    match val {
        toml::Value::String(s) => json!(s),
        toml::Value::Integer(i) => json!(i),
        toml::Value::Float(f) => json!(f),
        toml::Value::Boolean(b) => json!(b),
        toml::Value::Array(arr) => Value::Array(arr.iter().map(toml_value_to_json).collect()),
        toml::Value::Table(tbl) => toml_entry_to_json(tbl),
        toml::Value::Datetime(dt) => json!(dt.to_string()),
    }
}

/// Convert a full TOML table to a JSON object.
fn toml_table_to_json(table: &toml::Table) -> Value {
    toml_entry_to_json(table)
}

/// Convert a JSON Value back to a TOML string.
/// This is used when writing Codex config files.
fn json_to_toml_string(value: &Value) -> Result<String, CommandError> {
    let toml_val = json_to_toml_value(value)?;
    match toml_val {
        toml::Value::Table(tbl) => Ok(toml::to_string_pretty(&tbl)
            .map_err(|e| CommandError::MCPConfigError(format!("Failed to serialize TOML: {e}")))?),
        _ => Err(CommandError::MCPConfigError(
            "Top-level TOML value must be a table".to_string(),
        )),
    }
}

/// Recursively convert a JSON value to a TOML value.
fn json_to_toml_value(value: &Value) -> Result<toml::Value, CommandError> {
    match value {
        Value::Null => Ok(toml::Value::String(String::new())),
        Value::Bool(b) => Ok(toml::Value::Boolean(*b)),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(toml::Value::Integer(i))
            } else if let Some(f) = n.as_f64() {
                Ok(toml::Value::Float(f))
            } else {
                Err(CommandError::MCPConfigError(format!(
                    "Cannot convert number to TOML: {n}"
                )))
            }
        }
        Value::String(s) => Ok(toml::Value::String(s.clone())),
        Value::Array(arr) => {
            let items: Result<Vec<toml::Value>, _> = arr.iter().map(json_to_toml_value).collect();
            Ok(toml::Value::Array(items?))
        }
        Value::Object(obj) => {
            let mut table = toml::Table::new();
            for (k, v) in obj {
                table.insert(k.clone(), json_to_toml_value(v)?);
            }
            Ok(toml::Value::Table(table))
        }
    }
}
