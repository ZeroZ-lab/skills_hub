use crate::agent::detect::is_agent_installed;
use crate::agent::registry::{get_agent, get_all_agents};
use crate::error::CommandError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    #[serde(rename = "type")]
    pub agent_type: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub description: Option<String>,
    pub category: String,
    #[serde(rename = "skillsDir")]
    pub skills_dir: String,
    #[serde(rename = "globalSkillsDir")]
    pub global_skills_dir: String,
    #[serde(rename = "detectCommand")]
    pub detect_command: Option<String>,
    #[serde(rename = "detectPaths")]
    pub detect_paths: Option<Vec<String>>,
    #[serde(rename = "supportsMcp")]
    pub supports_mcp: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatus {
    pub config: AgentConfig,
    pub installed: bool,
    #[serde(rename = "isOnline")]
    pub is_online: bool,
    #[serde(rename = "skillCount")]
    pub skill_count: u32,
    #[serde(rename = "mcpCount")]
    pub mcp_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDetail {
    #[serde(flatten)]
    pub status: AgentStatus,
    pub skills: Vec<super::skills::Skill>,
    #[serde(rename = "mcpServers")]
    pub mcp_servers: Vec<super::mcp::MCPServer>,
    #[serde(rename = "configPaths")]
    pub config_paths: ConfigPaths,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigPaths {
    pub skills: String,
    pub mcp: Option<String>,
}

fn build_agent_status_list() -> Vec<AgentStatus> {
    let agents = get_all_agents();
    let lock = crate::lock::global::load_global_lock();
    let mcp_registry = crate::mcp_engine::registry::load_registry();

    // Build a map: agent_type -> count of skills installed to that agent (from lock)
    let mut lock_counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    for entry in lock.skills.values() {
        for install in &entry.installs {
            *lock_counts.entry(install.agent.clone()).or_insert(0) += 1;
        }
    }

    // For universal agents, they all share the same skills — use the deduplicated count
    // (skills installed to any universal agent, counted once)
    let universal_count = {
        let mut seen = std::collections::HashSet::new();
        for entry in lock.skills.values() {
            for install in &entry.installs {
                if crate::agent::registry::is_universal_agent(&install.agent) {
                    seen.insert(entry.installs[0].agent.clone()); // use skill name as key
                }
            }
        }
        // Actually count distinct skill names installed to any universal agent
        lock.skills
            .values()
            .filter(|e| {
                e.installs
                    .iter()
                    .any(|i| crate::agent::registry::is_universal_agent(&i.agent))
            })
            .count() as u32
    };

    let mut mcp_counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    for server in mcp_registry.servers.values() {
        for agent_type in server.agents.keys() {
            *mcp_counts.entry(agent_type.clone()).or_insert(0) += 1;
        }
    }

    agents
        .into_iter()
        .map(|entry| {
            let installed = is_agent_installed(&entry);
            let skill_count = if !installed {
                0
            } else if crate::agent::registry::is_universal_agent(&entry.agent_type) {
                universal_count
            } else {
                *lock_counts.get(&entry.agent_type).unwrap_or(&0)
            };
            let mcp_count = if !installed {
                0
            } else {
                *mcp_counts.get(&entry.agent_type).unwrap_or(&0)
            };
            AgentStatus {
                config: AgentConfig {
                    agent_type: entry.agent_type,
                    display_name: entry.display_name,
                    description: None,
                    category: entry.category,
                    skills_dir: entry.skills_dir,
                    global_skills_dir: entry.global_skills_dir.clone(),
                    detect_command: entry.detect_command,
                    detect_paths: if entry.detect_paths.is_empty() {
                        None
                    } else {
                        Some(entry.detect_paths)
                    },
                    supports_mcp: entry.mcp_config.is_some(),
                },
                installed,
                is_online: installed,
                skill_count,
                mcp_count,
            }
        })
        .collect()
}

/// Count the number of skill subdirectories in a given skills directory.
#[allow(dead_code)]
fn count_skills_in_dir(dir: &str) -> u32 {
    let path = std::path::Path::new(dir);
    if !path.is_dir() {
        return 0;
    }
    match std::fs::read_dir(path) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .count() as u32,
        Err(_) => 0,
    }
}

#[tauri::command]
pub async fn list_agents() -> Result<Vec<AgentStatus>, CommandError> {
    Ok(build_agent_status_list())
}

#[tauri::command]
pub async fn detect_agents() -> Result<Vec<AgentStatus>, CommandError> {
    // Force re-detection (same logic; registry is rebuilt each call)
    Ok(build_agent_status_list())
}

#[tauri::command]
pub async fn get_agent_detail(agent: String) -> Result<AgentDetail, CommandError> {
    let entry = get_agent(&agent).ok_or_else(|| CommandError::AgentNotFound(agent.clone()))?;
    let agent_type = entry.agent_type.clone();

    let installed = is_agent_installed(&entry);
    let lock = crate::lock::global::load_global_lock();
    let skill_count = if !installed {
        0
    } else if crate::agent::registry::is_universal_agent(&agent_type) {
        lock.skills
            .values()
            .filter(|e| {
                e.installs
                    .iter()
                    .any(|i| crate::agent::registry::is_universal_agent(&i.agent))
            })
            .count() as u32
    } else {
        lock.skills
            .values()
            .filter(|e| e.installs.iter().any(|i| i.agent == entry.agent_type))
            .count() as u32
    };

    let mcp_path = entry.mcp_config.as_ref().map(|m| m.config_path.clone());

    let status = AgentStatus {
        config: AgentConfig {
            agent_type: agent_type.clone(),
            display_name: entry.display_name,
            description: None,
            category: entry.category,
            skills_dir: entry.skills_dir,
            global_skills_dir: entry.global_skills_dir.clone(),
            detect_command: entry.detect_command,
            detect_paths: if entry.detect_paths.is_empty() {
                None
            } else {
                Some(entry.detect_paths)
            },
            supports_mcp: entry.mcp_config.is_some(),
        },
        installed,
        is_online: installed,
        skill_count,
        mcp_count: {
            let reg = crate::mcp_engine::registry::load_registry();
            if !installed {
                0
            } else {
                reg.servers
                    .values()
                    .filter(|server| server.agents.contains_key(&agent_type))
                    .count() as u32
            }
        },
    };

    Ok(AgentDetail {
        status,
        skills: vec![],
        mcp_servers: vec![],
        config_paths: ConfigPaths {
            skills: entry.global_skills_dir,
            mcp: mcp_path,
        },
    })
}
