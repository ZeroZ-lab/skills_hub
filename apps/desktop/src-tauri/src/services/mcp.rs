use std::collections::HashMap;

use crate::agent::registry::get_agent;
use crate::commands::mcp::{MCPAgentBinding, MCPAgentBindingInput, MCPServer};
use crate::error::CommandError;
use crate::mcp_engine::converter;
use crate::mcp_engine::registry::{self, MCPRegistryAgentBinding, MCPRegistryServer};
use crate::mcp_engine::sync;

/// The main orchestration layer for MCP server management.
pub struct MCPEngine;

impl MCPEngine {
    /// Add a new MCP server.
    ///
    /// 1. Generate UUID for ID
    /// 2. Create registry entry
    /// 3. For each enabled agent: sync to agent config
    /// 4. Save registry
    /// 5. Return MCPServer
    pub fn add_mcp_server(
        name: &str,
        server_type: &str,
        config: serde_json::Value,
        agent_inputs: &[MCPAgentBindingInput],
    ) -> Result<MCPServer, CommandError> {
        let now = chrono::Utc::now().to_rfc3339();

        // Build agent bindings map.
        let mut agents_map: HashMap<String, MCPRegistryAgentBinding> = HashMap::new();
        for input in agent_inputs {
            agents_map.insert(
                input.agent.clone(),
                MCPRegistryAgentBinding {
                    enabled: input.enabled,
                    sync_status: "pending".to_string(),
                    last_synced_at: None,
                    last_error: None,
                },
            );
        }

        // Add to registry (generates UUID and saves).
        let (id, mut server) = registry::add_server(name, server_type, config, agents_map)?;

        // Sync each enabled agent. We collect agent types first to avoid
        // borrowing `server` both mutably and immutably at the same time.
        let enabled_agents: Vec<String> = server
            .agents
            .iter()
            .filter(|(_, b)| b.enabled)
            .map(|(a, _)| a.clone())
            .collect();

        for agent_type in &enabled_agents {
            // Create a snapshot for sync (avoids borrow conflict with agents map).
            let server_snapshot = MCPRegistryServer {
                name: server.name.clone(),
                server_type: server.server_type.clone(),
                enabled: server.enabled,
                config: server.config.clone(),
                agents: HashMap::new(),
                created_at: server.created_at.clone(),
                updated_at: server.updated_at.clone(),
            };

            match sync::sync_server_to_agent(&server_snapshot, &server_snapshot.name, agent_type) {
                Ok(status) => {
                    if let Some(binding) = server.agents.get_mut(agent_type) {
                        binding.sync_status = "synced".to_string();
                        binding.last_synced_at = Some(status.synced_at);
                        binding.last_error = None;
                    }
                }
                Err(e) => {
                    if let Some(binding) = server.agents.get_mut(agent_type) {
                        binding.sync_status = "error".to_string();
                        binding.last_error = Some(e.to_string());
                    }
                    log::warn!(
                        "Failed to sync server '{}' to agent '{}': {}",
                        name,
                        agent_type,
                        e
                    );
                }
            }
        }

        // Save updated sync statuses.
        let mut reg = registry::load_registry();
        if let Some(entry) = reg.servers.get_mut(&id) {
            entry.agents = server.agents.clone();
        }
        registry::save_registry(&reg)?;

        Ok(registry_to_command_server(&id, &server))
    }

    /// Update an existing MCP server.
    ///
    /// 1. Load from registry
    /// 2. Apply partial updates (name, config, agents)
    /// 3. Re-sync affected agents
    /// 4. Save registry
    /// 5. Return MCPServer
    pub fn update_mcp_server(
        id: &str,
        name: Option<&str>,
        config: Option<serde_json::Value>,
        agent_inputs: Option<&[MCPAgentBindingInput]>,
    ) -> Result<MCPServer, CommandError> {
        let mut reg = registry::load_registry();
        let server = reg
            .servers
            .get_mut(id)
            .ok_or_else(|| CommandError::MCPConfigError(format!("Server '{id}' not found")))?;

        let old_name = server.name.clone();

        if let Some(n) = name {
            server.name = n.to_string();
        }
        if let Some(c) = config {
            server.config = c;
        }

        // If agents were provided, update the bindings.
        if let Some(inputs) = agent_inputs {
            let mut new_agents: HashMap<String, MCPRegistryAgentBinding> = HashMap::new();
            for input in inputs {
                // Preserve existing binding state if available.
                let existing = server.agents.get(&input.agent);
                new_agents.insert(
                    input.agent.clone(),
                    MCPRegistryAgentBinding {
                        enabled: input.enabled,
                        sync_status: existing
                            .map(|e| e.sync_status.clone())
                            .unwrap_or_else(|| "pending".to_string()),
                        last_synced_at: existing.and_then(|e| e.last_synced_at.clone()),
                        last_error: existing.and_then(|e| e.last_error.clone()),
                    },
                );
            }
            server.agents = new_agents;
        }

        server.updated_at = chrono::Utc::now().to_rfc3339();

        // If name changed, remove old entries from agent configs.
        if name.is_some() && old_name != server.name {
            for (agent_type, binding) in &server.agents {
                if binding.enabled {
                    let _ = sync::remove_server_from_agent(&old_name, agent_type);
                }
            }
        }

        // Re-sync all enabled agents.
        for (agent_type, binding) in server.agents.iter_mut() {
            if binding.enabled {
                // Clone needed data before the mutable borrow.
                let server_snapshot = MCPRegistryServer {
                    name: server.name.clone(),
                    server_type: server.server_type.clone(),
                    enabled: server.enabled,
                    config: server.config.clone(),
                    agents: HashMap::new(), // Not needed for sync.
                    created_at: server.created_at.clone(),
                    updated_at: server.updated_at.clone(),
                };

                match sync::sync_server_to_agent(
                    &server_snapshot,
                    &server_snapshot.name,
                    agent_type,
                ) {
                    Ok(status) => {
                        binding.sync_status = "synced".to_string();
                        binding.last_synced_at = Some(status.synced_at);
                        binding.last_error = None;
                    }
                    Err(e) => {
                        binding.sync_status = "error".to_string();
                        binding.last_error = Some(e.to_string());
                    }
                }
            } else {
                // If disabled, remove from agent config.
                let _ = sync::remove_server_from_agent(&server.name, agent_type);
                binding.sync_status = "pending".to_string();
            }
        }

        let result = registry_to_command_server(id, server);
        registry::save_registry(&reg)?;

        Ok(result)
    }

    /// Remove an MCP server.
    ///
    /// 1. Load from registry
    /// 2. Remove from all agent configs
    /// 3. Remove from registry
    /// 4. Save registry
    pub fn remove_mcp_server(id: &str) -> Result<(), CommandError> {
        let reg = registry::load_registry();
        let server = reg
            .servers
            .get(id)
            .ok_or_else(|| CommandError::MCPConfigError(format!("Server '{id}' not found")))?;

        // Remove from all agent configs.
        for (agent_type, binding) in &server.agents {
            if binding.enabled {
                if let Err(e) = sync::remove_server_from_agent(&server.name, agent_type) {
                    log::warn!(
                        "Failed to remove server '{}' from agent '{}': {}",
                        server.name,
                        agent_type,
                        e
                    );
                }
            }
        }

        // Remove from registry.
        registry::remove_server(id)?;

        Ok(())
    }

    /// Toggle a specific agent binding on/off for a server.
    ///
    /// 1. Load server from registry
    /// 2. Toggle enabled status for the specific agent
    /// 3. Sync/unsync accordingly
    /// 4. Save registry
    pub fn toggle_mcp_agent(
        server_id: &str,
        agent_type: &str,
        enabled: bool,
    ) -> Result<(), CommandError> {
        let mut reg = registry::load_registry();
        let server = reg.servers.get_mut(server_id).ok_or_else(|| {
            CommandError::MCPConfigError(format!("Server '{server_id}' not found"))
        })?;

        let binding = server
            .agents
            .entry(agent_type.to_string())
            .or_insert_with(|| MCPRegistryAgentBinding {
                enabled: false,
                sync_status: "pending".to_string(),
                last_synced_at: None,
                last_error: None,
            });

        binding.enabled = enabled;

        if enabled {
            // Sync to agent.
            let server_snapshot = MCPRegistryServer {
                name: server.name.clone(),
                server_type: server.server_type.clone(),
                enabled: server.enabled,
                config: server.config.clone(),
                agents: HashMap::new(),
                created_at: server.created_at.clone(),
                updated_at: server.updated_at.clone(),
            };

            match sync::sync_server_to_agent(&server_snapshot, &server_snapshot.name, agent_type) {
                Ok(status) => {
                    binding.sync_status = "synced".to_string();
                    binding.last_synced_at = Some(status.synced_at);
                    binding.last_error = None;
                }
                Err(e) => {
                    binding.sync_status = "error".to_string();
                    binding.last_error = Some(e.to_string());
                }
            }
        } else {
            // Remove from agent config.
            let server_name = server.name.clone();
            if let Err(e) = sync::remove_server_from_agent(&server_name, agent_type) {
                log::warn!(
                    "Failed to remove server '{}' from agent '{}': {}",
                    server_name,
                    agent_type,
                    e
                );
            }
            binding.sync_status = "pending".to_string();
        }

        server.updated_at = chrono::Utc::now().to_rfc3339();
        registry::save_registry(&reg)?;

        Ok(())
    }

    /// Import MCP servers from an agent's config file.
    ///
    /// 1. Read agent's config file
    /// 2. Parse to extract MCP servers
    /// 3. Create registry entries for new ones (skip duplicates by name)
    /// 4. Return imported servers
    pub fn import_mcp_from_agent(agent_type: &str) -> Result<Vec<MCPServer>, CommandError> {
        let agent_entry = get_agent(agent_type)
            .ok_or_else(|| CommandError::AgentNotFound(agent_type.to_string()))?;
        let mapping = agent_entry.mcp_config.as_ref().ok_or_else(|| {
            CommandError::MCPConfigError(format!(
                "Agent '{agent_type}' does not support MCP configuration"
            ))
        })?;

        let config_path = std::path::Path::new(&mapping.config_path);
        if !config_path.exists() {
            return Ok(vec![]);
        }

        let content = std::fs::read_to_string(config_path)?;
        if content.trim().is_empty() {
            return Ok(vec![]);
        }

        let imported = converter::from_agent_format(&content, agent_type)?;
        if imported.is_empty() {
            return Ok(vec![]);
        }

        let mut reg = registry::load_registry();
        let now = chrono::Utc::now().to_rfc3339();
        let mut result = Vec::new();

        // Build a set of existing server names for duplicate detection.
        let existing_names: std::collections::HashSet<String> =
            reg.servers.values().map(|s| s.name.clone()).collect();

        for srv in imported {
            if existing_names.contains(&srv.name) {
                // Server already exists — try to enable the agent binding.
                for (id, entry) in reg.servers.iter_mut() {
                    if entry.name == srv.name {
                        let binding =
                            entry
                                .agents
                                .entry(agent_type.to_string())
                                .or_insert_with(|| MCPRegistryAgentBinding {
                                    enabled: false,
                                    sync_status: "pending".to_string(),
                                    last_synced_at: None,
                                    last_error: None,
                                });
                        binding.enabled = true;
                        binding.sync_status = "synced".to_string();
                        binding.last_synced_at = Some(now.clone());
                        entry.updated_at = now.clone();
                        result.push(registry_to_command_server(id, entry));
                        break;
                    }
                }
                continue;
            }

            // Create new registry entry.
            let id = uuid::Uuid::new_v4().to_string();
            let mut agents_map: HashMap<String, MCPRegistryAgentBinding> = HashMap::new();
            agents_map.insert(
                agent_type.to_string(),
                MCPRegistryAgentBinding {
                    enabled: true,
                    sync_status: "synced".to_string(),
                    last_synced_at: Some(now.clone()),
                    last_error: None,
                },
            );

            let entry = MCPRegistryServer {
                name: srv.name,
                server_type: srv.server_type,
                enabled: true,
                config: srv.config,
                agents: agents_map,
                created_at: now.clone(),
                updated_at: now.clone(),
            };

            result.push(registry_to_command_server(&id, &entry));
            reg.servers.insert(id, entry);
        }

        registry::save_registry(&reg)?;

        Ok(result)
    }

    /// List all MCP servers, optionally filtered by agent.
    ///
    /// 1. Load registry
    /// 2. Filter by agent if specified
    /// 3. Convert to Vec<MCPServer>
    pub fn list_mcp_servers(agent: Option<&str>) -> Result<Vec<MCPServer>, CommandError> {
        let reg = registry::load_registry();
        let mut servers: Vec<MCPServer> = Vec::new();

        for (id, entry) in &reg.servers {
            if let Some(agent_filter) = agent {
                if agent_filter == "universal" {
                    if !entry
                        .agents
                        .keys()
                        .any(|agent_type| crate::agent::registry::is_universal_agent(agent_type))
                    {
                        continue;
                    }
                } else if !entry.agents.contains_key(agent_filter) {
                    continue;
                }
            }
            servers.push(registry_to_command_server(id, entry));
        }

        // Sort by name for consistent ordering.
        servers.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(servers)
    }
}

/// Convert a registry server entry to the command-layer MCPServer type.
fn registry_to_command_server(id: &str, server: &MCPRegistryServer) -> MCPServer {
    let agents: Vec<MCPAgentBinding> = server
        .agents
        .iter()
        .map(|(agent_type, binding)| {
            let agent_entry = get_agent(agent_type);
            let (config_path, format) = agent_entry
                .and_then(|a| a.mcp_config)
                .map(|m| (m.config_path, m.format))
                .unwrap_or_else(|| ("".to_string(), "json".to_string()));

            MCPAgentBinding {
                agent: agent_type.clone(),
                enabled: binding.enabled,
                config_path,
                format,
                sync_status: binding.sync_status.clone(),
                last_synced_at: binding.last_synced_at.clone(),
                last_error: binding.last_error.clone(),
            }
        })
        .collect();

    MCPServer {
        id: id.to_string(),
        name: server.name.clone(),
        server_type: server.server_type.clone(),
        enabled: server.enabled,
        connection_status: None,
        config: server.config.clone(),
        agents,
        created_at: server.created_at.clone(),
        updated_at: server.updated_at.clone(),
    }
}
