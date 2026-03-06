use crate::services::discover::{
    search_mcp_servers_with_meta, search_skills_with_meta, DiscoverResponse, DiscoveredMCPServer,
    DiscoveredSkill,
};

#[tauri::command]
pub async fn discover_skills(
    query: String,
    limit: Option<u32>,
) -> Result<DiscoverResponse<DiscoveredSkill>, String> {
    log::info!("Discovering skills with query: {}", query);

    let limit = limit.unwrap_or(100);
    let results = search_skills_with_meta(&query, limit).await?;

    Ok(results)
}

#[tauri::command]
pub async fn get_featured() -> Result<DiscoverResponse<DiscoveredSkill>, String> {
    log::info!("Getting featured skills");

    let results = search_skills_with_meta("ai", 100).await?;

    Ok(results)
}

#[tauri::command]
pub async fn discover_mcp_servers(
    query: String,
    limit: Option<u32>,
) -> Result<DiscoverResponse<DiscoveredMCPServer>, String> {
    log::info!("Discovering MCP servers with query: {}", query);

    let limit = limit.unwrap_or(50);
    let results = search_mcp_servers_with_meta(&query, limit).await?;

    Ok(results)
}

#[tauri::command]
pub async fn get_featured_mcp() -> Result<DiscoverResponse<DiscoveredMCPServer>, String> {
    log::info!("Getting featured MCP servers");

    let results = search_mcp_servers_with_meta("mcp", 50).await?;

    Ok(results)
}
