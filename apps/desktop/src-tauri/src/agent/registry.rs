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
        // --- Universal agents (skillsDir == ".agents/skills") ---
        AgentRegistryEntry {
            agent_type: "amp".to_string(),
            display_name: "Amp".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![format!("{cfg}/amp")],
            mcp_config: None,
        },
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
            agent_type: "cline".to_string(),
            display_name: "Cline".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.cline")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "cursor".to_string(),
            display_name: "Cursor".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.cursor")],
            mcp_config: Some(MCPConfigMapping {
                format: "json".to_string(),
                config_path: format!("{h}/.cursor/mcp.json"),
                config_key: "mcpServers".to_string(),
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
            agent_type: "github-copilot".to_string(),
            display_name: "GitHub Copilot".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.copilot")],
            mcp_config: None,
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
            agent_type: "kimi-cli".to_string(),
            display_name: "Kimi Code CLI".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.kimi")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "replit".to_string(),
            display_name: "Replit".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![], // detected via .replit in cwd, not global
            mcp_config: None,
        },
        // --- Non-universal agents (agent-specific skillsDir) ---
        AgentRegistryEntry {
            agent_type: "antigravity".to_string(),
            display_name: "Antigravity".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".agent/skills".to_string(),
            global_skills_dir: format!("{h}/.gemini/antigravity/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.gemini/antigravity")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "augment".to_string(),
            display_name: "Augment".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".augment/skills".to_string(),
            global_skills_dir: format!("{h}/.augment/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.augment")],
            mcp_config: None,
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
        AgentRegistryEntry {
            agent_type: "codebuddy".to_string(),
            display_name: "CodeBuddy".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".codebuddy/skills".to_string(),
            global_skills_dir: format!("{h}/.codebuddy/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.codebuddy")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "command-code".to_string(),
            display_name: "Command Code".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".commandcode/skills".to_string(),
            global_skills_dir: format!("{h}/.commandcode/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.commandcode")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "continue".to_string(),
            display_name: "Continue".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".continue/skills".to_string(),
            global_skills_dir: format!("{h}/.continue/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.continue")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "cortex".to_string(),
            display_name: "Cortex Code".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".cortex/skills".to_string(),
            global_skills_dir: format!("{h}/.snowflake/cortex/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.snowflake/cortex")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "crush".to_string(),
            display_name: "Crush".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".crush/skills".to_string(),
            global_skills_dir: format!("{cfg}/crush/skills"),
            detect_command: None,
            detect_paths: vec![format!("{cfg}/crush")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "droid".to_string(),
            display_name: "Droid".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".factory/skills".to_string(),
            global_skills_dir: format!("{h}/.factory/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.factory")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "goose".to_string(),
            display_name: "Goose".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".goose/skills".to_string(),
            global_skills_dir: format!("{cfg}/goose/skills"),
            detect_command: None,
            detect_paths: vec![format!("{cfg}/goose")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "junie".to_string(),
            display_name: "Junie".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".junie/skills".to_string(),
            global_skills_dir: format!("{h}/.junie/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.junie")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "iflow-cli".to_string(),
            display_name: "iFlow CLI".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".iflow/skills".to_string(),
            global_skills_dir: format!("{h}/.iflow/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.iflow")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "kilo".to_string(),
            display_name: "Kilo Code".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".kilocode/skills".to_string(),
            global_skills_dir: format!("{h}/.kilocode/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.kilocode")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "kiro-cli".to_string(),
            display_name: "Kiro CLI".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".kiro/skills".to_string(),
            global_skills_dir: format!("{h}/.kiro/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.kiro")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "kode".to_string(),
            display_name: "Kode".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".kode/skills".to_string(),
            global_skills_dir: format!("{h}/.kode/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.kode")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "mcpjam".to_string(),
            display_name: "MCPJam".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".mcpjam/skills".to_string(),
            global_skills_dir: format!("{h}/.mcpjam/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.mcpjam")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "mistral-vibe".to_string(),
            display_name: "Mistral Vibe".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".vibe/skills".to_string(),
            global_skills_dir: format!("{h}/.vibe/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.vibe")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "mux".to_string(),
            display_name: "Mux".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".mux/skills".to_string(),
            global_skills_dir: format!("{h}/.mux/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.mux")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "openhands".to_string(),
            display_name: "OpenHands".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".openhands/skills".to_string(),
            global_skills_dir: format!("{h}/.openhands/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.openhands")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "pi".to_string(),
            display_name: "Pi".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".pi/skills".to_string(),
            global_skills_dir: format!("{h}/.pi/agent/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.pi/agent")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "qoder".to_string(),
            display_name: "Qoder".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".qoder/skills".to_string(),
            global_skills_dir: format!("{h}/.qoder/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.qoder")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "qwen-code".to_string(),
            display_name: "Qwen Code".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".qwen/skills".to_string(),
            global_skills_dir: format!("{h}/.qwen/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.qwen")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "roo".to_string(),
            display_name: "Roo Code".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".roo/skills".to_string(),
            global_skills_dir: format!("{h}/.roo/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.roo")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "trae".to_string(),
            display_name: "Trae".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".trae/skills".to_string(),
            global_skills_dir: format!("{h}/.trae/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.trae")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "trae-cn".to_string(),
            display_name: "Trae CN".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".trae/skills".to_string(),
            global_skills_dir: format!("{h}/.trae-cn/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.trae-cn")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "windsurf".to_string(),
            display_name: "Windsurf".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".windsurf/skills".to_string(),
            global_skills_dir: format!("{h}/.codeium/windsurf/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.codeium/windsurf")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "zencoder".to_string(),
            display_name: "Zencoder".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".zencoder/skills".to_string(),
            global_skills_dir: format!("{h}/.zencoder/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.zencoder")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "neovate".to_string(),
            display_name: "Neovate".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".neovate/skills".to_string(),
            global_skills_dir: format!("{h}/.neovate/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.neovate")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "pochi".to_string(),
            display_name: "Pochi".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".pochi/skills".to_string(),
            global_skills_dir: format!("{h}/.pochi/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.pochi")],
            mcp_config: None,
        },
        AgentRegistryEntry {
            agent_type: "adal".to_string(),
            display_name: "AdaL".to_string(),
            category: "non-universal".to_string(),
            skills_dir: ".adal/skills".to_string(),
            global_skills_dir: format!("{h}/.adal/skills"),
            detect_command: None,
            detect_paths: vec![format!("{h}/.adal")],
            mcp_config: None,
        },
        // --- Special: universal meta-agent ---
        AgentRegistryEntry {
            agent_type: "universal".to_string(),
            display_name: "Universal".to_string(),
            category: "universal".to_string(),
            skills_dir: ".agents/skills".to_string(),
            global_skills_dir: format!("{h}/.agents/skills"),
            detect_command: None,
            detect_paths: vec![], // always reports as not installed
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

/// Returns agent types that use the universal `.agents/skills` directory
/// (excluding replit and the universal meta-agent itself).
pub fn get_universal_agents() -> Vec<String> {
    get_all_agents()
        .into_iter()
        .filter(|a| {
            a.skills_dir == ".agents/skills"
                && a.agent_type != "universal"
                && a.agent_type != "replit"
        })
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

/// Check if an agent uses the universal `.agents/skills` directory.
/// Also treats "global" as universal (legacy installs recorded agent as "global").
pub fn is_universal_agent(agent_type: &str) -> bool {
    if agent_type == "global" {
        return true; // legacy: old installs recorded as "global"
    }
    get_agent(agent_type)
        .map(|a| a.skills_dir == ".agents/skills")
        .unwrap_or(false)
}
