#![allow(unused_variables)]

pub mod agent;
pub mod commands;
pub mod config;
pub mod error;
pub mod git;
pub mod lock;
pub mod mcp_engine;
pub mod provider;
pub mod services;
pub mod skill_parser;
pub mod source;

use commands::{agents, discover, mcp, skills, system};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Skills commands
            skills::list_skills,
            skills::install_skill,
            skills::remove_skill,
            skills::add_skill_to_agents,
            skills::update_skill,
            skills::check_updates,
            skills::get_skill_detail,
            skills::resolve_source,
            skills::scan_skills,
            skills::import_skills,
            // MCP commands
            mcp::list_mcp_servers,
            mcp::add_mcp_server,
            mcp::update_mcp_server,
            mcp::remove_mcp_server,
            mcp::toggle_mcp_agent,
            mcp::import_mcp_from_agent,
            // Agent commands
            agents::list_agents,
            agents::detect_agents,
            agents::get_agent_detail,
            // System commands
            system::get_app_config,
            system::update_app_config,
            system::export_config,
            system::import_config,
            system::create_backup,
            system::restore_backup,
            system::get_logs,
            system::handle_deep_link,
            // Discover commands
            discover::discover_skills,
            discover::get_featured,
            discover::discover_mcp_servers,
            discover::get_featured_mcp,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
