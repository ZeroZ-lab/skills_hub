use crate::error::CommandError;
use crate::services::skill_import::{import_skills_from_agent, scan_and_import_skills, ScanResult};
use crate::services::skills::SkillEngine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub source: Source,
    #[serde(rename = "canonicalPath")]
    pub canonical_path: String,
    pub version: Option<String>,
    pub author: Option<String>,
    pub tags: Vec<String>,
    pub installs: Vec<AgentInstallRecord>,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    #[serde(rename = "treeSha")]
    pub tree_sha: Option<String>,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    #[serde(rename = "type")]
    pub source_type: String,
    pub url: String,
    pub subpath: Option<String>,
    #[serde(rename = "ref")]
    pub git_ref: Option<String>,
    pub provider: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInstallRecord {
    pub agent: String,
    pub scope: String,
    pub mode: String,
    #[serde(rename = "installedPath")]
    pub installed_path: String,
    #[serde(rename = "installedAt")]
    pub installed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDetail {
    #[serde(flatten)]
    pub skill: Skill,
    #[serde(rename = "readmeContent")]
    pub readme_content: String,
    #[serde(rename = "fileList")]
    pub file_list: Vec<String>,
    #[serde(rename = "sourceUrl")]
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedSkill {
    pub name: String,
    pub description: Option<String>,
    pub source: Source,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub name: String,
    #[serde(rename = "currentHash")]
    pub current_hash: String,
    #[serde(rename = "latestHash")]
    pub latest_hash: String,
    #[serde(rename = "hasUpdate")]
    pub has_update: bool,
    #[serde(rename = "currentVersion")]
    pub current_version: Option<String>,
    #[serde(rename = "latestVersion")]
    pub latest_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentBindingOverride {
    pub mode: Option<String>,
    pub scope: Option<String>,
}

#[tauri::command]
pub async fn list_skills(
    agent: Option<String>,
    scope: Option<String>,
    query: Option<String>,
) -> Result<Vec<Skill>, CommandError> {
    let engine = SkillEngine::new();
    Ok(engine.list_skills(agent.as_deref(), scope.as_deref(), query.as_deref()))
}

#[tauri::command]
pub async fn install_skill(
    source: String,
    agents: Vec<String>,
    mode: String,
    scope: String,
    force: Option<bool>,
    agent_bindings: Option<HashMap<String, AgentBindingOverride>>,
) -> Result<Skill, CommandError> {
    let engine = SkillEngine::new();
    engine
        .install_skill(
            &source,
            &agents,
            &mode,
            &scope,
            force.unwrap_or(false),
            agent_bindings.as_ref(),
        )
        .await
}

#[tauri::command]
pub async fn remove_skill(
    name: String,
    agents: Option<Vec<String>>,
    clean_cache: Option<bool>,
) -> Result<(), CommandError> {
    let engine = SkillEngine::new();
    engine
        .remove_skill(&name, agents.as_deref(), clean_cache.unwrap_or(false))
        .await
}

#[tauri::command]
pub async fn add_skill_to_agents(
    name: String,
    agents: Vec<String>,
    mode: Option<String>,
    scope: Option<String>,
) -> Result<Skill, CommandError> {
    let engine = SkillEngine::new();

    // Get the skill's source from lock file
    let skills = engine.list_skills(None, None, Some(&name));
    let skill = skills
        .into_iter()
        .find(|s| s.name == name)
        .ok_or_else(|| CommandError::SkillNotFound(name.clone()))?;

    // Install to the new agents using the existing source
    engine
        .install_skill(
            &skill.source.url,
            &agents,
            &mode.unwrap_or_else(|| "symlink".to_string()),
            &scope.unwrap_or_else(|| "global".to_string()),
            false, // Don't force reinstall
            None,  // No agent-specific overrides
        )
        .await
}

#[tauri::command]
pub async fn update_skill(name: String) -> Result<Skill, CommandError> {
    let engine = SkillEngine::new();
    engine.update_skill(&name).await
}

#[tauri::command]
pub async fn check_updates() -> Result<Vec<UpdateCheckResult>, CommandError> {
    let engine = SkillEngine::new();
    engine.check_updates().await
}

#[tauri::command]
pub async fn get_skill_detail(name: String) -> Result<SkillDetail, CommandError> {
    let engine = SkillEngine::new();
    engine.get_skill_detail(&name)
}

#[tauri::command]
pub async fn resolve_source(source: String) -> Result<Vec<ResolvedSkill>, CommandError> {
    let engine = SkillEngine::new();
    engine.resolve_source(&source).await
}

#[tauri::command]
pub async fn scan_skills() -> Result<ScanResult, CommandError> {
    scan_and_import_skills().await
}

#[tauri::command]
pub async fn import_skills(agent: String) -> Result<ScanResult, CommandError> {
    import_skills_from_agent(&agent).await
}
