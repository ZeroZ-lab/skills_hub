use crate::error::CommandError;
use crate::services::mcp::MCPEngine;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServer {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub server_type: String,
    pub enabled: bool,
    #[serde(rename = "connectionStatus")]
    pub connection_status: Option<String>,
    pub config: serde_json::Value,
    pub agents: Vec<MCPAgentBinding>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPAgentBinding {
    pub agent: String,
    pub enabled: bool,
    #[serde(rename = "configPath")]
    pub config_path: String,
    pub format: String,
    #[serde(rename = "syncStatus")]
    pub sync_status: String,
    #[serde(rename = "lastSyncedAt")]
    pub last_synced_at: Option<String>,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPAgentBindingInput {
    pub agent: String,
    pub enabled: bool,
}

#[tauri::command]
pub async fn list_mcp_servers(agent: Option<String>) -> Result<Vec<MCPServer>, CommandError> {
    MCPEngine::list_mcp_servers(agent.as_deref())
}

#[tauri::command]
pub async fn add_mcp_server(
    name: String,
    server_type: String,
    config: serde_json::Value,
    agents: Vec<MCPAgentBindingInput>,
) -> Result<MCPServer, CommandError> {
    MCPEngine::add_mcp_server(&name, &server_type, config, &agents)
}

#[tauri::command]
pub async fn update_mcp_server(
    id: String,
    name: Option<String>,
    config: Option<serde_json::Value>,
    agents: Option<Vec<MCPAgentBindingInput>>,
) -> Result<MCPServer, CommandError> {
    MCPEngine::update_mcp_server(&id, name.as_deref(), config, agents.as_deref())
}

#[tauri::command]
pub async fn remove_mcp_server(id: String) -> Result<(), CommandError> {
    MCPEngine::remove_mcp_server(&id)
}

#[tauri::command]
pub async fn toggle_mcp_agent(
    server_id: String,
    agent: String,
    enabled: bool,
) -> Result<(), CommandError> {
    MCPEngine::toggle_mcp_agent(&server_id, &agent, enabled)
}

#[tauri::command]
pub async fn import_mcp_from_agent(agent: String) -> Result<Vec<MCPServer>, CommandError> {
    MCPEngine::import_mcp_from_agent(&agent)
}
