use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CommandError {
    #[error("Invalid source format: {0}")]
    InvalidSource(String),

    #[error("Skill \"{0}\" already exists")]
    SkillExists(String),

    #[error("Skill \"{0}\" not found")]
    SkillNotFound(String),

    #[error("Agent \"{0}\" not found or not installed")]
    AgentNotFound(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Invalid SKILL.md format: {0}")]
    InvalidSkill(String),

    #[error("Permission denied: {0}")]
    PermissionError(String),

    #[error("MCP configuration error: {0}")]
    MCPConfigError(String),

    #[error("Provider error: {0}")]
    ProviderError(String),

    #[error("Rate limit exceeded")]
    RateLimit,

    #[error("Lock file conflict: {0}")]
    LockConflict(String),

    #[error("Internal error: {0}")]
    InternalError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
}

#[derive(Serialize)]
struct SerializedError {
    code: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<String>,
}

impl From<CommandError> for tauri::ipc::InvokeError {
    fn from(err: CommandError) -> Self {
        let (code, details) = match &err {
            CommandError::InvalidSource(d) => ("INVALID_SOURCE", Some(d.clone())),
            CommandError::SkillExists(_) => ("SKILL_EXISTS", None),
            CommandError::SkillNotFound(_) => ("SKILL_NOT_FOUND", None),
            CommandError::AgentNotFound(_) => ("AGENT_NOT_FOUND", None),
            CommandError::NetworkError(d) => ("NETWORK_ERROR", Some(d.clone())),
            CommandError::InvalidSkill(d) => ("INVALID_SKILL", Some(d.clone())),
            CommandError::PermissionError(d) => ("PERMISSION_ERROR", Some(d.clone())),
            CommandError::MCPConfigError(d) => ("MCP_CONFIG_ERROR", Some(d.clone())),
            CommandError::ProviderError(d) => ("PROVIDER_ERROR", Some(d.clone())),
            CommandError::RateLimit => ("RATE_LIMIT", None),
            CommandError::LockConflict(d) => ("LOCK_CONFLICT", Some(d.clone())),
            CommandError::InternalError(d) => ("INTERNAL_ERROR", Some(d.clone())),
            CommandError::IoError(e) => ("INTERNAL_ERROR", Some(e.to_string())),
            CommandError::JsonError(e) => ("INTERNAL_ERROR", Some(e.to_string())),
        };
        let serialized = SerializedError {
            code: code.to_string(),
            message: err.to_string(),
            details,
        };
        tauri::ipc::InvokeError::from(serde_json::to_value(serialized).unwrap())
    }
}
