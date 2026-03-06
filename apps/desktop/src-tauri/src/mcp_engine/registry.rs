use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::error::CommandError;

/// On-disk registry file format stored at `~/.skills-manager/mcp-servers.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPRegistryFile {
    pub version: u32,
    pub servers: HashMap<String, MCPRegistryServer>,
}

impl Default for MCPRegistryFile {
    fn default() -> Self {
        Self {
            version: 1,
            servers: HashMap::new(),
        }
    }
}

/// A single MCP server entry stored in the registry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPRegistryServer {
    pub name: String,
    #[serde(rename = "type")]
    pub server_type: String,
    pub enabled: bool,
    /// For stdio: `{ "command": "...", "args": [...], "env": {...} }`
    /// For sse/http: `{ "url": "...", "headers": {...} }`
    pub config: serde_json::Value,
    /// Agent bindings keyed by agent_type (e.g. "claude-code", "cursor", "codex").
    pub agents: HashMap<String, MCPRegistryAgentBinding>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// Per-agent binding stored inside a registry server entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPRegistryAgentBinding {
    pub enabled: bool,
    #[serde(rename = "syncStatus")]
    pub sync_status: String,
    #[serde(rename = "lastSyncedAt")]
    pub last_synced_at: Option<String>,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
}

/// Get the path to the MCP registry file.
pub fn registry_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".skills-manager")
        .join("mcp-servers.json")
}

/// Load the MCP registry from disk. Returns the default (empty) registry if
/// the file does not exist or cannot be parsed.
pub fn load_registry() -> MCPRegistryFile {
    let path = registry_path();
    if !path.exists() {
        return MCPRegistryFile::default();
    }
    match std::fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => MCPRegistryFile::default(),
    }
}

/// Save the MCP registry to disk using an atomic write (write to temp, then rename).
pub fn save_registry(registry: &MCPRegistryFile) -> Result<(), CommandError> {
    let path = registry_path();
    let dir = path
        .parent()
        .ok_or_else(|| CommandError::MCPConfigError("Invalid registry path".to_string()))?;

    std::fs::create_dir_all(dir)?;

    let json = serde_json::to_string_pretty(registry)?;

    // Atomic write via tempfile in the same directory
    let tmp_path = dir.join("mcp-servers.json.tmp");
    std::fs::write(&tmp_path, &json)?;
    std::fs::rename(&tmp_path, &path)?;

    Ok(())
}

/// Look up a single server by ID.
pub fn get_server(id: &str) -> Option<MCPRegistryServer> {
    let reg = load_registry();
    reg.servers.get(id).cloned()
}

/// Add a new server to the registry. Returns the generated ID and the server entry.
pub fn add_server(
    name: &str,
    server_type: &str,
    config: serde_json::Value,
    agents: HashMap<String, MCPRegistryAgentBinding>,
) -> Result<(String, MCPRegistryServer), CommandError> {
    let mut reg = load_registry();

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let server = MCPRegistryServer {
        name: name.to_string(),
        server_type: server_type.to_string(),
        enabled: true,
        config,
        agents,
        created_at: now.clone(),
        updated_at: now,
    };

    reg.servers.insert(id.clone(), server.clone());
    save_registry(&reg)?;

    Ok((id, server))
}

/// Update an existing server entry. Only non-None fields are applied.
pub fn update_server(
    id: &str,
    name: Option<&str>,
    config: Option<serde_json::Value>,
    agents: Option<HashMap<String, MCPRegistryAgentBinding>>,
) -> Result<MCPRegistryServer, CommandError> {
    let mut reg = load_registry();

    let server = reg
        .servers
        .get_mut(id)
        .ok_or_else(|| CommandError::MCPConfigError(format!("Server '{id}' not found")))?;

    if let Some(n) = name {
        server.name = n.to_string();
    }
    if let Some(c) = config {
        server.config = c;
    }
    if let Some(a) = agents {
        server.agents = a;
    }

    server.updated_at = chrono::Utc::now().to_rfc3339();

    let updated = server.clone();
    save_registry(&reg)?;

    Ok(updated)
}

/// Remove a server from the registry by ID.
pub fn remove_server(id: &str) -> Result<(), CommandError> {
    let mut reg = load_registry();

    if reg.servers.remove(id).is_none() {
        return Err(CommandError::MCPConfigError(format!(
            "Server '{id}' not found"
        )));
    }

    save_registry(&reg)?;
    Ok(())
}
