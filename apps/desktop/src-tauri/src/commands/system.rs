use crate::config::app_config;
use crate::error::CommandError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(rename = "defaultMode")]
    pub default_mode: String,
    #[serde(rename = "defaultScope")]
    pub default_scope: String,
    #[serde(rename = "updateInterval")]
    pub update_interval: u32,
    #[serde(rename = "cacheTTL")]
    pub cache_ttl: u32,
    #[serde(rename = "githubToken")]
    pub github_token: Option<String>,
    pub theme: String,
    pub proxy: Option<String>,
    #[serde(rename = "customAgentRegistry")]
    pub custom_agent_registry: Option<String>,
    #[serde(rename = "sourceAliases")]
    pub source_aliases: HashMap<String, String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            default_mode: "symlink".to_string(),
            default_scope: "global".to_string(),
            update_interval: 24,
            cache_ttl: 24,
            github_token: None,
            theme: "dark".to_string(),
            proxy: None,
            custom_agent_registry: None,
            source_aliases: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    #[serde(rename = "skillsImported")]
    pub skills_imported: u32,
    #[serde(rename = "mcpImported")]
    pub mcp_imported: u32,
    #[serde(rename = "pendingSecrets")]
    pub pending_secrets: Vec<PendingMCPSecretInput>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingMCPSecretInput {
    #[serde(rename = "serverName")]
    pub server_name: String,
    pub fields: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogResult {
    pub logs: Vec<LogEntry>,
    pub total: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub action: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepLinkAction {
    #[serde(rename = "type")]
    pub action_type: String,
    pub source: String,
    #[serde(rename = "resolvedSkills")]
    pub resolved_skills: Vec<super::skills::ResolvedSkill>,
}

#[tauri::command]
pub async fn get_app_config() -> Result<AppConfig, CommandError> {
    let data = app_config::load_config();
    Ok(AppConfig {
        default_mode: data.default_mode,
        default_scope: data.default_scope,
        update_interval: data.update_interval,
        cache_ttl: data.cache_ttl,
        github_token: data.github_token,
        theme: data.theme,
        proxy: data.proxy,
        custom_agent_registry: data.custom_agent_registry,
        source_aliases: data.source_aliases,
    })
}

#[tauri::command]
pub async fn update_app_config(config: serde_json::Value) -> Result<AppConfig, CommandError> {
    let mut current = app_config::load_config();

    // Merge the incoming partial JSON into the current config
    if let Some(obj) = config.as_object() {
        if let Some(v) = obj.get("defaultMode").and_then(|v| v.as_str()) {
            current.default_mode = v.to_string();
        }
        if let Some(v) = obj.get("defaultScope").and_then(|v| v.as_str()) {
            current.default_scope = v.to_string();
        }
        if let Some(v) = obj.get("updateInterval").and_then(|v| v.as_u64()) {
            current.update_interval = v as u32;
        }
        if let Some(v) = obj.get("cacheTTL").and_then(|v| v.as_u64()) {
            current.cache_ttl = v as u32;
        }
        if let Some(v) = obj.get("githubToken") {
            current.github_token = v.as_str().map(|s| s.to_string());
        }
        if let Some(v) = obj.get("theme").and_then(|v| v.as_str()) {
            current.theme = v.to_string();
        }
        if let Some(v) = obj.get("proxy") {
            current.proxy = v.as_str().map(|s| s.to_string());
        }
        if let Some(v) = obj.get("customAgentRegistry") {
            current.custom_agent_registry = v.as_str().map(|s| s.to_string());
        }
        if let Some(v) = obj.get("sourceAliases").and_then(|v| v.as_object()) {
            for (key, val) in v {
                if let Some(s) = val.as_str() {
                    current.source_aliases.insert(key.clone(), s.to_string());
                }
            }
        }
    }

    app_config::save_config(&current)?;

    Ok(AppConfig {
        default_mode: current.default_mode,
        default_scope: current.default_scope,
        update_interval: current.update_interval,
        cache_ttl: current.cache_ttl,
        github_token: current.github_token,
        theme: current.theme,
        proxy: current.proxy,
        custom_agent_registry: current.custom_agent_registry,
        source_aliases: current.source_aliases,
    })
}

#[tauri::command]
pub async fn export_config(
    format: String,
    path: String,
    include_secrets: Option<bool>,
) -> Result<String, CommandError> {
    let result = crate::services::export_import::export_config(
        &format,
        &path,
        include_secrets.unwrap_or(false),
    )?;
    Ok(result)
}

#[tauri::command]
pub async fn import_config(path: String) -> Result<ImportResult, CommandError> {
    crate::services::export_import::import_config(&path)
}

#[tauri::command]
pub async fn create_backup(
    path: String,
    include_secrets: Option<bool>,
) -> Result<String, CommandError> {
    crate::services::backup::create_backup(&path, include_secrets.unwrap_or(false))
}

#[tauri::command]
pub async fn restore_backup(path: String) -> Result<ImportResult, CommandError> {
    crate::services::backup::restore_backup(&path)
}

#[tauri::command]
pub async fn get_logs(
    level: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<LogResult, CommandError> {
    let (logs, total) = crate::services::logger::get_logs(level.as_deref(), limit, offset)?;
    Ok(LogResult { logs, total })
}

#[tauri::command]
pub async fn handle_deep_link(url: String) -> Result<DeepLinkAction, CommandError> {
    crate::services::deeplink::parse_deep_link(&url)
}
