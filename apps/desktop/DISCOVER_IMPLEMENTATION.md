# Skills Manager - 实现 Discover 功能

## vercel-skills 的实现分析

### 核心机制
1. **API 搜索**: 调用 `https://skills.sh/api/search?q=query&limit=10`
2. **交互式界面**: 使用 readline + raw mode 实现 fzf 风格搜索
3. **两种模式**: 非交互（直接显示）和交互（搜索界面）

## 在 Skills Manager 中的实现建议

### 方案 1: 使用 skills.sh API（推荐）

**优点:**
- 真实的 skills 数据
- 包含安装统计
- 持续更新

**实现步骤:**

#### 1. Rust 后端实现

```rust
// src-tauri/src/services/discover.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscoveredSkill {
    pub id: String,
    pub name: String,
    pub source: String,
    pub installs: u32,
    pub description: Option<String>,
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
    installs: u32,
}

pub async fn search_skills(query: &str) -> Result<Vec<DiscoveredSkill>, String> {
    let url = format!(
        "https://skills.sh/api/search?q={}&limit=20",
        urlencoding::encode(query)
    );

    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let data: SkillsApiResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    Ok(data
        .skills
        .into_iter()
        .map(|skill| DiscoveredSkill {
            id: skill.id,
            name: skill.name,
            source: skill.source,
            installs: skill.installs,
            description: None,
        })
        .collect())
}
```

#### 2. Tauri 命令

```rust
// src-tauri/src/commands/discover.rs

use crate::services::discover::{search_skills, DiscoveredSkill};

#[tauri::command]
pub async fn discover_skills(query: String) -> Result<Vec<DiscoveredSkill>, String> {
    search_skills(&query).await
}

#[tauri::command]
pub async fn get_featured_skills() -> Result<Vec<DiscoveredSkill>, String> {
    // 可以调用 API 获取热门 skills
    search_skills("").await
}
```

#### 3. 前端集成

```typescript
// src/stores/discover.ts

search: async (query: string) => {
  set({ isLoading: true, error: null, searchQuery: query });
  try {
    const results = await invoke<DiscoveredSkill[]>('discover_skills', { query });
    set({ results, isLoading: false });
  } catch (err) {
    set({ error: String(err), isLoading: false });
  }
},
```

### 方案 2: GitHub Code Search

如果 skills.sh API 不可用，可以使用 GitHub Code Search：

```rust
pub async fn search_github_skills(query: &str) -> Result<Vec<DiscoveredSkill>, String> {
    let url = format!(
        "https://api.github.com/search/code?q=filename:SKILL.md+{}",
        urlencoding::encode(query)
    );

    // 需要 GitHub token
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("User-Agent", "Skills-Manager")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await?;

    // 解析结果...
}
```

### 方案 3: 本地索引

维护一个本地的 skills 索引文件：

```json
// skills-index.json
{
  "skills": [
    {
      "name": "react-best-practices",
      "source": "vercel-labs/agent-skills@react-best-practices",
      "category": "React",
      "tags": ["react", "performance"],
      "installs": 3200
    }
  ]
}
```

## 推荐实现顺序

1. **立即**: 使用 skills.sh API（方案 1）
2. **备选**: 如果 API 限流，添加本地缓存
3. **未来**: 实现 GitHub Code Search 作为备选

## 需要添加的依赖

```toml
# Cargo.toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
urlencoding = "2.1"
```

## 测试 API

```bash
# 测试 skills.sh API
curl "https://skills.sh/api/search?q=react&limit=10"
```

## 下一步

1. 实现 Rust 后端的 discover 服务
2. 添加 Tauri 命令
3. 更新前端 store 调用真实 API
4. 添加缓存机制（避免频繁请求）
5. 添加错误处理和重试逻辑
