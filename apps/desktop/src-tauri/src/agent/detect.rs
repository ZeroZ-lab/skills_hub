use super::registry::{get_all_agents, AgentRegistryEntry};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionResult {
    pub agent_type: String,
    pub installed: bool,
}

pub async fn detect_all_agents() -> Vec<DetectionResult> {
    let agents = get_all_agents();
    let mut results = Vec::new();

    for agent in &agents {
        let installed = is_agent_installed(agent);
        results.push(DetectionResult {
            agent_type: agent.agent_type.clone(),
            installed,
        });
    }
    results
}

pub fn is_agent_installed(agent: &AgentRegistryEntry) -> bool {
    // Check detect_paths first
    for path in &agent.detect_paths {
        if Path::new(path).exists() {
            return true;
        }
    }
    // Check detect_command via which
    if let Some(cmd) = &agent.detect_command {
        if let Ok(output) = Command::new("which").arg(cmd).output() {
            if output.status.success() {
                return true;
            }
        }
    }
    false
}
