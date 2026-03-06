use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfigData {
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

impl Default for AppConfigData {
    fn default() -> Self {
        Self {
            default_mode: "symlink".to_string(),
            default_scope: "global".to_string(),
            update_interval: 24,
            cache_ttl: 24,
            github_token: None,
            theme: "system".to_string(),
            proxy: None,
            custom_agent_registry: None,
            source_aliases: HashMap::new(),
        }
    }
}

pub fn get_config_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_default().join(".skills-manager")
}

pub fn get_config_path() -> PathBuf {
    get_config_dir().join("config.json")
}

pub fn load_config() -> AppConfigData {
    let path = get_config_path();
    if !path.exists() {
        return AppConfigData::default();
    }
    match std::fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => AppConfigData::default(),
    }
}

pub fn save_config(config: &AppConfigData) -> Result<(), std::io::Error> {
    let dir = get_config_dir();
    std::fs::create_dir_all(&dir)?;

    let json = serde_json::to_string_pretty(config)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    // Atomic write: write to temp file then rename
    let path = get_config_path();
    let tmp_path = dir.join("config.json.tmp");
    std::fs::write(&tmp_path, json)?;
    std::fs::rename(&tmp_path, &path)?;
    Ok(())
}
