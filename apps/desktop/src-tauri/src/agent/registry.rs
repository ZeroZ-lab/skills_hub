use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRegistryEntry {
    pub agent_type: String,
    pub display_name: String,
    pub category: String,
    pub skills_dir: String,
    pub global_skills_dir: String,
    pub detect_command: Option<String>,
    pub detect_paths: Vec<String>,
    pub mcp_config: Option<MCPConfigMapping>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPConfigMapping {
    pub format: String,
    pub config_path: String,
    pub config_key: String,
}

fn home() -> String {
    dirs::home_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

fn config_home() -> String {
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        if !xdg.is_empty() {
            return xdg;
        }
    }
    format!("{}/.config", home())
}

pub fn get_all_agents() -> Vec<AgentRegistryEntry> {
    let h = home();
    let cfg = config_home();

    let codex_home = std::env::var("CODEX_HOME")
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| format!("{h}/.codex"));

    let claude_home = std::env::var("CLAUDE_CONFIG_DIR")
        .ok()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| format!("{h}/.claude"));

    vec![
        AgentRegistryEntry {
            agent_type: "codex".to_string(),
            display_name: "Codex".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![codex_home.clone(), "/etc/codex".to_string()],
            mcp_config: Some(MCPConfigMapping {
                format: "toml".to_string(),
                config_path: format!("{codex_home}/config.toml"),
                config_key: "mcp.servers".to_string(),
            }),
        },
        AgentRegistryEntry {
            agent_type: "gemini-cli".to_string(),
            display_name: "Gemini CLI".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.gemini")],
            mcp_config: Some(MCPConfigMapping {
                format: "json".to_string(),
                config_path: format!("{h}/.gemini/settings.json"),
                config_key: "mcpServers".to_string(),
            }),
        },
        AgentRegistryEntry {
            agent_type: "opencode".to_string(),
            display_name: "OpenCode".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![format!("{cfg}/opencode")],
            mcp_config: Some(MCPConfigMapping {
                format: "json".to_string(),
                config_path: format!("{cfg}/opencode/opencode.json"),
                config_key: "mcpServers".to_string(),
            }),
        },
        AgentRegistryEntry {
            agent_type: "claude-code".to_string(),
            display_name: "Claude Code".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".claude/skills".to_string(),
            global_skills_dir: format!("{claude_home}/skills"),
            detect_command: None,
            detect_paths: vec![claude_home.clone()],
            mcp_config: Some(MCPConfigMapping {
                format: "json".to_string(),
                config_path: format!("{h}/.claude.json"),
                config_key: "mcpServers".to_string(),
            }),
        },
        AgentRegistryEntry {
            agent_type: "openclaw".to_string(),
            display_name: "OpenClaw".to_string(),
            category: "non-universal".to_string(),
            skills_dir: "skills".to_string(),
            global_skills_dir: get_openclaw_global_skills_dir(&h),
            detect_command: None,
            detect_paths: vec![
                format!("{h}/.openclaw"),
                format!("{h}/.clawdbot"),
                format!("{h}/.moltbot"),
            ],
            mcp_config: None,
        },
        // Internal shared-skills target used by the UI for universal installs.
        AgentRegistryEntry {
            agent_type: "universal".to_string(),
            display_name: "Universal".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![],
            mcp_config: None,
        },
    ]
}

/// Resolve the OpenClaw global skills directory, checking for legacy fallback dirs.
fn get_openclaw_global_skills_dir(home: &str) -> String {
    let openclaw = format!("{home}/.openclaw");
    if std::path::Path::new(&openclaw).exists() {
        return format!("{openclaw}/skills");
    }
    let clawdbot = format!("{home}/.clawdbot");
    if std::path::Path::new(&clawdbot).exists() {
        return format!("{clawdbot}/skills");
    }
    let moltbot = format!("{home}/.moltbot");
    if std::path::Path::new(&moltbot).exists() {
        return format!("{moltbot}/skills");
    }
    format!("{openclaw}/skills")
}

pub fn get_agent(agent_type: &str) -> Option<AgentRegistryEntry> {
    get_all_agents()
        .into_iter()
        .find(|a| a.agent_type == agent_type)
}

/// Returns agent types that use the shared `.agents/skills` directory.
pub fn get_universal_agents() -> Vec<String> {
    get_all_agents()
        .into_iter()
        .filter(|a| a.skills_dir == ".agents/skills" && a.agent_type != "universal")
        .map(|a| a.agent_type)
        .collect()
}

/// Returns agent types that use agent-specific skill directories.
pub fn get_non_universal_agents() -> Vec<String> {
    get_all_agents()
        .into_iter()
        .filter(|a| a.skills_dir != ".agents/skills")
        .map(|a| a.agent_type)
        .collect()
}

/// Check if an agent uses the shared `.agents/skills` directory.
/// Also treats `global` as universal for legacy installs.
pub fn is_universal_agent(agent_type: &str) -> bool {
    if agent_type == "global" {
        return true;
    }
    get_agent(agent_type)
        .map(|a| a.skills_dir == ".agents/skills")
        .unwrap_or(false)
}
