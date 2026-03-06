use crate::agent::registry::{AgentInfo, AgentRegistry};
use crate::config::app_config::AppConfig;
use serde_json::json;
use std::collections::HashMap;

pub fn create_test_app_config() -> AppConfig {
    AppConfig {
        language: "zh-CN".to_string(),
        theme: "system".to_string(),
        github_token: None,
        registry_urls: vec![],
        auto_update_check: true,
        proxy_config: None,
    }
}

pub fn create_test_agent_info() -> AgentInfo {
    AgentInfo {
        id: "test-agent".to_string(),
        name: "Test Agent".to_string(),
        description: Some("A test agent".to_string()),
        icon: Some("test-icon".to_string()),
        install_path: Some("/test/path".to_string()),
        detected: true,
    }
}

pub fn create_test_agent_registry() -> AgentRegistry {
    let mut registry = AgentRegistry::new();
    registry.register(create_test_agent_info());
    registry
}

pub fn test_skill_metadata() -> serde_json::Value {
    json!({
        "name": "test-skill",
        "version": "1.0.0",
        "description": "A test skill",
        "author": "Test Author",
        "tags": ["test", "example"]
    })
}

pub fn test_mcp_config() -> serde_json::Value {
    json!({
        "name": "test-mcp",
        "transport": "stdio",
        "command": "test-command",
        "args": ["--test"]
    })
}
