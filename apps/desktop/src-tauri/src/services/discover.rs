use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, SystemTime};

use crate::config::app_config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredSkill {
    pub id: String,
    pub name: String,
    pub source: String,
    pub install_source: String,
    pub installs: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoverResponse<T> {
    pub items: Vec<T>,
    pub cache_hit: bool,
    pub refreshing: bool,
    pub fetched_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredMCPServer {
    pub id: String,
    pub name: String,
    pub source: String,
    pub installs: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stars: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SkillsApiResponse {
    skills: Vec<SkillsApiSkill>,
}

#[derive(Debug, Deserialize)]
struct SkillsApiSkill {
    id: String,
    name: String,
    source: String,
    #[serde(rename = "skillId", default)]
    skill_id: String,
    installs: u32,
    created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubSearchResponse {
    items: Vec<GitHubRepoItem>,
}

#[derive(Debug, Deserialize)]
struct GitHubRepoItem {
    id: u64,
    name: String,
    html_url: String,
    stargazers_count: u32,
    description: Option<String>,
    created_at: Option<String>,
    owner: GitHubOwner,
}

#[derive(Debug, Deserialize)]
struct GitHubOwner {
    login: String,
}

const SKILLS_API_BASE: &str = "https://skills.sh";
const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Clone)]
enum CachePayload {
    Skills(Vec<DiscoveredSkill>),
    Mcp(Vec<DiscoveredMCPServer>),
}

#[derive(Clone)]
struct CacheEntry {
    fetched_at: SystemTime,
    payload: CachePayload,
}

#[derive(Clone, Copy)]
struct DiscoverPolicy {
    cache_ttl: Duration,
    refresh_interval: Duration,
}

static DISCOVER_CACHE: OnceLock<Mutex<HashMap<String, CacheEntry>>> = OnceLock::new();

fn discover_cache() -> &'static Mutex<HashMap<String, CacheEntry>> {
    DISCOVER_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn build_policy() -> DiscoverPolicy {
    let config = app_config::load_config();
    DiscoverPolicy {
        cache_ttl: Duration::from_secs(config.cache_ttl as u64 * 3600),
        refresh_interval: Duration::from_secs(config.update_interval as u64 * 3600),
    }
}

fn make_cache_key(kind: &str, query: &str, limit: u32) -> String {
    format!("{}:{}:{}", kind, query.trim(), limit)
}

fn read_cache_entry(key: &str) -> Option<CacheEntry> {
    let cache = discover_cache();
    let guard = cache.lock().ok()?;
    guard.get(key).cloned()
}

fn write_cache_entry(key: String, payload: CachePayload) {
    if let Ok(mut guard) = discover_cache().lock() {
        guard.insert(
            key,
            CacheEntry {
                fetched_at: SystemTime::now(),
                payload,
            },
        );
    }
}

fn remove_cache_entry(key: &str) {
    if let Ok(mut guard) = discover_cache().lock() {
        guard.remove(key);
    }
}

fn age_of(entry: &CacheEntry) -> Duration {
    SystemTime::now()
        .duration_since(entry.fetched_at)
        .unwrap_or(Duration::ZERO)
}

fn unix_timestamp(time: SystemTime) -> u64 {
    time
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
}

fn build_http_client() -> Result<reqwest::Client, String> {
    let config = app_config::load_config();
    let mut builder = reqwest::Client::builder().timeout(std::time::Duration::from_secs(10));

    if let Some(proxy_url) = config.proxy.as_deref().filter(|v| !v.trim().is_empty()) {
        let proxy = reqwest::Proxy::all(proxy_url)
            .map_err(|e| format!("Invalid proxy configuration '{}': {}", proxy_url, e))?;
        builder = builder.proxy(proxy);
    }

    builder
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))
}

pub async fn search_skills(query: &str, limit: u32) -> Result<Vec<DiscoveredSkill>, String> {
    Ok(search_skills_with_meta(query, limit).await?.items)
}

pub async fn search_skills_with_meta(
    query: &str,
    limit: u32,
) -> Result<DiscoverResponse<DiscoveredSkill>, String> {
    let policy = build_policy();
    let cache_key = make_cache_key("skills", query, limit);

    if !policy.cache_ttl.is_zero() {
        if let Some(entry) = read_cache_entry(&cache_key) {
            let age = age_of(&entry);
            if age <= policy.cache_ttl {
                let refreshing = !policy.refresh_interval.is_zero() && age >= policy.refresh_interval;
                if !policy.refresh_interval.is_zero() && age >= policy.refresh_interval {
                    let query_owned = query.to_string();
                    let key_owned = cache_key.clone();
                    tokio::spawn(async move {
                        if let Ok(fresh) = fetch_skills(&query_owned, limit).await {
                            write_cache_entry(key_owned, CachePayload::Skills(fresh));
                        }
                    });
                }

                if let CachePayload::Skills(skills) = entry.payload {
                    return Ok(DiscoverResponse {
                        items: skills,
                        cache_hit: true,
                        refreshing,
                        fetched_at: unix_timestamp(entry.fetched_at),
                    });
                }
            } else {
                remove_cache_entry(&cache_key);
            }
        }
    }

    let skills = fetch_skills(query, limit).await?;
    if !policy.cache_ttl.is_zero() {
        write_cache_entry(cache_key, CachePayload::Skills(skills.clone()));
    }

    Ok(DiscoverResponse {
        items: skills,
        cache_hit: false,
        refreshing: false,
        fetched_at: unix_timestamp(SystemTime::now()),
    })
}

async fn fetch_skills(query: &str, limit: u32) -> Result<Vec<DiscoveredSkill>, String> {
    let url = format!(
        "{}/api/search?q={}&limit={}",
        SKILLS_API_BASE,
        urlencoding::encode(query),
        limit
    );

    log::info!("Searching skills: {}", url);

    let client = build_http_client()?;

    let response = client
        .get(&url)
        .header("User-Agent", "Skills-Manager/0.3.0")
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let data: SkillsApiResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    log::info!("Found {} skills", data.skills.len());

    Ok(data
        .skills
        .into_iter()
        .map(|skill| {
            let source = skill.source.trim().to_string();
            let raw_skill_id = skill.skill_id.trim().to_string();
            let skill_id = if raw_skill_id.is_empty() { skill.name.trim().to_string() } else { raw_skill_id };
            let install_source = if source.is_empty() {
                format!("@{}", skill_id)  // degenerate case; SourceParser will reject
            } else {
                format!("{}@{}", source, skill_id)
            };
            DiscoveredSkill {
                id: skill.id,
                name: skill.name,
                source: skill.source,
                install_source,
                installs: skill.installs,
                description: None,
                category: None,
                tags: None,
                created_at: skill.created_at,
            }
        })
        .collect())
}

pub async fn get_featured_skills_with_meta() -> Result<DiscoverResponse<DiscoveredSkill>, String> {
    let policy = build_policy();
    let cache_key = "skills:__featured__:0".to_string();

    if !policy.cache_ttl.is_zero() {
        if let Some(entry) = read_cache_entry(&cache_key) {
            let age = age_of(&entry);
            if age <= policy.cache_ttl {
                let refreshing = !policy.refresh_interval.is_zero() && age >= policy.refresh_interval;
                if refreshing {
                    let key_owned = cache_key.clone();
                    tokio::spawn(async move {
                        if let Ok(fresh) = fetch_featured_skills().await {
                            write_cache_entry(key_owned, CachePayload::Skills(fresh));
                        }
                    });
                }
                if let CachePayload::Skills(skills) = entry.payload {
                    return Ok(DiscoverResponse {
                        items: skills,
                        cache_hit: true,
                        refreshing,
                        fetched_at: unix_timestamp(entry.fetched_at),
                    });
                }
            } else {
                remove_cache_entry(&cache_key);
            }
        }
    }

    let skills = fetch_featured_skills().await?;
    if !policy.cache_ttl.is_zero() {
        write_cache_entry(cache_key, CachePayload::Skills(skills.clone()));
    }

    Ok(DiscoverResponse {
        items: skills,
        cache_hit: false,
        refreshing: false,
        fetched_at: unix_timestamp(SystemTime::now()),
    })
}

async fn fetch_featured_skills() -> Result<Vec<DiscoveredSkill>, String> {
    const KEYWORDS: &[&str] = &["git", "react", "python", "test", "docker"];
    const LIMIT_PER_KEYWORD: u32 = 20;

    let mut set = tokio::task::JoinSet::new();
    for &kw in KEYWORDS {
        set.spawn(fetch_skills(kw, LIMIT_PER_KEYWORD));
    }

    let mut all_skills: Vec<DiscoveredSkill> = Vec::new();
    let mut any_success = false;

    while let Some(result) = set.join_next().await {
        match result {
            Ok(Ok(skills)) => {
                any_success = true;
                all_skills.extend(skills);
            }
            Ok(Err(e)) => {
                log::warn!("Featured keyword query failed: {}", e);
            }
            Err(e) => {
                log::warn!("Featured keyword task panicked: {}", e);
            }
        }
    }

    if !any_success {
        return Err("All featured discovery queries failed".to_string());
    }

    // Dedup by compound id, sort by installs desc, take 50
    let mut seen = std::collections::HashSet::new();
    let mut deduped: Vec<DiscoveredSkill> = all_skills
        .into_iter()
        .filter(|s| seen.insert(s.id.clone()))
        .collect();
    deduped.sort_by(|a, b| b.installs.cmp(&a.installs));
    deduped.truncate(50);

    Ok(deduped)
}

pub async fn search_mcp_servers(query: &str, limit: u32) -> Result<Vec<DiscoveredMCPServer>, String> {
    Ok(search_mcp_servers_with_meta(query, limit).await?.items)
}

pub async fn search_mcp_servers_with_meta(
    query: &str,
    limit: u32,
) -> Result<DiscoverResponse<DiscoveredMCPServer>, String> {
    let policy = build_policy();
    let cache_key = make_cache_key("mcp", query, limit);

    if !policy.cache_ttl.is_zero() {
        if let Some(entry) = read_cache_entry(&cache_key) {
            let age = age_of(&entry);
            if age <= policy.cache_ttl {
                let refreshing = !policy.refresh_interval.is_zero() && age >= policy.refresh_interval;
                if !policy.refresh_interval.is_zero() && age >= policy.refresh_interval {
                    let query_owned = query.to_string();
                    let key_owned = cache_key.clone();
                    tokio::spawn(async move {
                        if let Ok(fresh) = fetch_mcp_servers(&query_owned, limit).await {
                            write_cache_entry(key_owned, CachePayload::Mcp(fresh));
                        }
                    });
                }

                if let CachePayload::Mcp(servers) = entry.payload {
                    return Ok(DiscoverResponse {
                        items: servers,
                        cache_hit: true,
                        refreshing,
                        fetched_at: unix_timestamp(entry.fetched_at),
                    });
                }
            } else {
                remove_cache_entry(&cache_key);
            }
        }
    }

    let servers = fetch_mcp_servers(query, limit).await?;
    if !policy.cache_ttl.is_zero() {
        write_cache_entry(cache_key, CachePayload::Mcp(servers.clone()));
    }

    Ok(DiscoverResponse {
        items: servers,
        cache_hit: false,
        refreshing: false,
        fetched_at: unix_timestamp(SystemTime::now()),
    })
}

async fn fetch_mcp_servers(query: &str, limit: u32) -> Result<Vec<DiscoveredMCPServer>, String> {
    let trimmed = query.trim();
    let search_query = if trimmed.is_empty() {
        "topic:mcp-server".to_string()
    } else {
        format!("{} topic:mcp-server", trimmed)
    };

    let per_page = limit.clamp(1, 100);
    let url = format!(
        "{}/search/repositories?q={}&sort=stars&order=desc&per_page={}",
        GITHUB_API_BASE,
        urlencoding::encode(&search_query),
        per_page
    );

    log::info!("Searching MCP servers: {}", url);

    let client = build_http_client()?;

    let github_token = app_config::load_config().github_token;

    let mut request = client
        .get(&url)
        .header("User-Agent", "Skills-Manager/0.3.0")
        .header("Accept", "application/vnd.github+json");

    if let Some(token) = github_token.as_deref().filter(|v| !v.trim().is_empty()) {
        request = request.bearer_auth(token);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API error: {}", response.status()));
    }

    let data: GitHubSearchResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    log::info!("Found {} MCP servers", data.items.len());

    Ok(data
        .items
        .into_iter()
        .map(|repo| DiscoveredMCPServer {
            id: repo.id.to_string(),
            name: repo.name,
            source: repo.html_url,
            installs: repo.stargazers_count,
            description: repo.description,
            author: Some(repo.owner.login),
            stars: Some(repo.stargazers_count),
            created_at: repo.created_at,
        })
        .collect())
}

pub async fn get_featured_mcp_servers() -> Result<Vec<DiscoveredMCPServer>, String> {
    search_mcp_servers("mcp", 50).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_search_skills() {
        let results = search_skills("react", 5).await;
        assert!(results.is_ok());
        let skills = results.unwrap();
        assert!(!skills.is_empty());
    }

    #[tokio::test]
    async fn test_get_featured_with_meta() {
        let results = get_featured_skills_with_meta().await;
        assert!(results.is_ok());
        let response = results.unwrap();
        assert!(!response.items.is_empty());
        // All items must have non-empty install_source in "owner/repo@skill" format
        for skill in &response.items {
            assert!(skill.install_source.contains('@'), "install_source should contain '@': {}", skill.install_source);
        }
    }

    #[test]
    fn test_install_source_format() {
        // Simulate the mapping logic from fetch_skills()
        let source = "vercel-labs/agent-skills";
        let skill_id = "vercel-react-best-practices";
        let install_source = format!("{}@{}", source, skill_id);
        assert_eq!(install_source, "vercel-labs/agent-skills@vercel-react-best-practices");
    }

    #[test]
    fn test_install_source_fallback_to_name() {
        // When skillId is empty, name is used as fallback
        let source = "some-owner/some-repo";
        let skill_id = "";
        let skill_name = "some-skill-name";
        let effective_id = if skill_id.is_empty() { skill_name } else { skill_id };
        let install_source = format!("{}@{}", source, effective_id);
        assert_eq!(install_source, "some-owner/some-repo@some-skill-name");
    }
}
