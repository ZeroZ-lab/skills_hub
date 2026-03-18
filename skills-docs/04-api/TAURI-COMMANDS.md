# Tauri Commands API 文档

**文档编号**: SM-API-001
**版本**: 0.3.0
**状态**: 草案
**最后更新**: 2026-03-01

---

## 1. 概述

本文档定义 Skills Manager 的 Tauri Commands 接口，即 Rust 后端暴露给 React 前端的所有命令。前端通过 `invoke()` 调用这些命令。

### 1.1 调用约定

```typescript
import { invoke } from '@tauri-apps/api/core';

// 示例
const skills = await invoke<Skill[]>('list_skills', { agent: 'claude-code' });
```

### 1.2 错误处理

所有命令在失败时返回统一的错误格式：

```typescript
interface CommandError {
  code: string;          // 错误码（如 "SKILL_EXISTS"）
  message: string;       // 用户友好的错误描述
  details?: string;      // 技术细节（调试用）
}
```

### 1.3 错误码列表

| 错误码 | 说明 |
|--------|------|
| `INVALID_SOURCE` | 来源格式无法识别 |
| `SKILL_EXISTS` | 同名 Skill 已安装 |
| `SKILL_NOT_FOUND` | Skill 不存在 |
| `AGENT_NOT_FOUND` | Agent 未安装 |
| `NETWORK_ERROR` | 网络请求失败 |
| `INVALID_SKILL` | SKILL.md 格式无效 |
| `PERMISSION_ERROR` | 无写权限 |
| `MCP_CONFIG_ERROR` | MCP 配置读写失败 |
| `PROVIDER_ERROR` | Provider 加载失败 |
| `RATE_LIMIT` | API 速率限制 |
| `LOCK_CONFLICT` | Lock 文件写入冲突 |
| `INTERNAL_ERROR` | 内部错误 |

---

## 2. Skills 命令

### 2.1 list_skills

列出已安装的 Skills。

```rust
#[tauri::command]
async fn list_skills(
    agent: Option<String>,
    scope: Option<String>,
    query: Option<String>,
) -> Result<Vec<Skill>, CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agent` | `string?` | 否 | 按 Agent 筛选，如 `"claude-code"` |
| `scope` | `string?` | 否 | 按作用域筛选：`"global"` / `"project"` |
| `query` | `string?` | 否 | 搜索关键词 |

**返回**: `Skill[]`

**示例**:

```typescript
// 列出所有
const all = await invoke<Skill[]>('list_skills');

// 按 Agent 筛选
const claude = await invoke<Skill[]>('list_skills', { agent: 'claude-code' });

// 搜索
const results = await invoke<Skill[]>('list_skills', { query: 'review' });
```

---

### 2.2 install_skill

安装 Skill。

```rust
#[tauri::command]
async fn install_skill(
    source: String,
    agents: Vec<String>,
    mode: String,
    scope: String,
    force: Option<bool>,
    agent_bindings: Option<HashMap<String, AgentBindingOverride>>,
) -> Result<Skill, CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `source` | `string` | 是 | 来源（支持 12+ 种格式） |
| `agents` | `string[]` | 是 | 目标 Agent 列表 |
| `mode` | `string` | 是 | 默认 mode：`"symlink"` 或 `"copy"` |
| `scope` | `string` | 是 | 默认 scope：`"global"` 或 `"project"` |
| `force` | `bool?` | 否 | 是否强制覆盖 |
| `agent_bindings` | `Record<string, AgentBindingOverride>?` | 否 | 覆盖特定 Agent 的 scope/mode，key 为 AgentType |

**AgentBindingOverride**:

```rust
pub struct AgentBindingOverride {
    pub mode: Option<String>,   // "symlink" | "copy"，省略则用全局 mode
    pub scope: Option<String>,  // "global" | "project"，省略则用全局 scope
}
```

**返回**: `Skill`

**事件**: 安装过程中通过 `emit()` 发送进度事件：

```typescript
// 前端监听
listen('install-progress', (event) => {
  // event.payload: { step: string, progress: number, total: number }
});
```

| 进度步骤 | 说明 |
|---------|------|
| `parsing` | 解析来源 |
| `resolving` | Provider 解析 |
| `fetching` | 拉取文件 |
| `validating` | 校验 SKILL.md |
| `installing` | 安装到 Agent 目录 |
| `locking` | 更新 Lock 文件 |
| `done` | 完成 |

---

### 2.3 remove_skill

卸载 Skill。

```rust
#[tauri::command]
async fn remove_skill(
    name: String,
    agents: Option<Vec<String>>,
    clean_cache: Option<bool>,
) -> Result<(), CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | Skill 名称 |
| `agents` | `string[]?` | 否 | 从指定 Agent 移除，省略则全部移除 |
| `clean_cache` | `bool?` | 否 | 是否清理 Canonical Path 缓存 |

---

### 2.4 update_skill

更新 Skill。

```rust
#[tauri::command]
async fn update_skill(
    name: String,
) -> Result<Skill, CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | 是 | Skill 名称 |

---

### 2.5 check_updates

检查所有 Skill 是否有更新。

```rust
#[tauri::command]
async fn check_updates() -> Result<Vec<UpdateCheckResult>, CommandError>
```

**返回**:

```typescript
interface UpdateCheckResult {
  name: string;
  currentHash: string;
  latestHash: string;
  hasUpdate: boolean;
}
```

---

### 2.6 get_skill_detail

获取 Skill 详情（含 SKILL.md 渲染内容）。

```rust
#[tauri::command]
async fn get_skill_detail(
    name: String,
) -> Result<SkillDetail, CommandError>
```

**返回**:

```typescript
interface SkillDetail extends Skill {
  readmeContent: string;     // SKILL.md 原始内容
  fileList: string[];        // Skill 目录文件列表
  sourceUrl?: string;        // 来源仓库 URL
}
```

---

### 2.7 resolve_source

预解析来源，返回可安装的 Skill 列表（用于安装前预览）。

```rust
#[tauri::command]
async fn resolve_source(
    source: String,
) -> Result<Vec<ResolvedSkill>, CommandError>
```

**返回**:

```typescript
interface ResolvedSkill {
  name: string;
  description?: string;
  source: Source;
  provider: string;
}
```

---

## 3. MCP 命令（Agent 附属配置）

**重要变更**: MCP 配置直接属于 Agent，**无全局注册表**。所有 MCP 命令必须指定目标 Agent。

### 3.1 list_agent_mcp_servers

列出指定 Agent 的 MCP Server 配置。

```rust
#[tauri::command]
async fn list_agent_mcp_servers(
    agent: String,
) -> Result<Vec<AgentMCPServer>, CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agent` | `string` | 是 | Agent 类型，如 `"claude-code"` |

**说明**:
- 直接读取 Agent 的配置文件返回 MCP 配置列表
- 无中央注册表，所有配置实时从 Agent 配置文件中读取

---

### 3.2 add_agent_mcp_server

为指定 Agent 添加 MCP Server 配置。

```rust
#[tauri::command]
async fn add_agent_mcp_server(
    agent: String,
    name: String,
    server_type: String,
    config: serde_json::Value,
) -> Result<AgentMCPServer, CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agent` | `string` | 是 | 目标 Agent 类型 |
| `name` | `string` | 是 | Server 名称 |
| `server_type` | `string` | 是 | `"stdio"` / `"sse"` / `"http"` |
| `config` | `object` | 是 | 配置详情（根据 type 不同） |

**config 示例（stdio）**:

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem"],
  "env": { "HOME": "/Users/me" }
}
```

**说明**:
- 直接将 MCP 配置写入 Agent 的配置文件（如 `~/.claude.json`）
- 无全局注册表，无需同步操作

---

### 3.3 update_agent_mcp_server

更新指定 Agent 的 MCP Server 配置。

```rust
#[tauri::command]
async fn update_agent_mcp_server(
    agent: String,
    id: String,
    name: Option<String>,
    config: Option<serde_json::Value>,
) -> Result<AgentMCPServer, CommandError>
```

**说明**:
- 直接更新 Agent 配置文件中的对应 MCP 条目
- 所有变更立即写入 Agent 配置文件

---

### 3.4 remove_agent_mcp_server

从指定 Agent 删除 MCP Server 配置。

```rust
#[tauri::command]
async fn remove_agent_mcp_server(
    agent: String,
    id: String,
) -> Result<(), CommandError>
```

---

### 3.5 toggle_agent_mcp_server

启用/禁用指定 Agent 的某个 MCP Server。

```rust
#[tauri::command]
async fn toggle_agent_mcp_server(
    agent: String,
    id: String,
    enabled: bool,
) -> Result<(), CommandError>
```

**说明**:
- 禁用时直接从 Agent 配置文件中移除该 MCP 条目
- 启用时重新添加（保留原配置）

---

### 3.6 import_mcp_from_agent

从 Agent 配置文件导入 MCP Server 配置到 Skills Manager（用于展示）。

```rust
#[tauri::command]
async fn import_mcp_from_agent(
    agent: String,
) -> Result<Vec<AgentMCPServer>, CommandError>
```

**说明**:
- 读取 Agent 配置文件中的现有 MCP 配置
- 返回的配置仅用于展示，不创建全局注册表条目

---

## 4. Agent 命令

### 4.1 list_agents

列出所有支持的 Agent 及其检测状态。

```rust
#[tauri::command]
async fn list_agents() -> Result<Vec<AgentStatus>, CommandError>
```

**返回**:

```typescript
interface AgentStatus {
  config: AgentConfig;       // Agent 配置信息
  installed: boolean;        // 是否已安装
  isOnline: boolean;         // Agent 进程是否在线/可检测到
  skillCount: number;        // 已安装 Skills 数量
  mcpCount: number;          // 已配置 MCP Server 数量
}
```

---

### 4.2 detect_agents

重新检测本机已安装的 Agent。

```rust
#[tauri::command]
async fn detect_agents() -> Result<Vec<AgentStatus>, CommandError>
```

---

### 4.3 get_agent_detail

获取单个 Agent 的详细信息。

```rust
#[tauri::command]
async fn get_agent_detail(
    agent: String,
) -> Result<AgentDetail, CommandError>
```

**返回**:

```typescript
interface AgentDetail extends AgentStatus {
  skills: Skill[];           // 该 Agent 已安装的 Skills
  mcpServers: MCPServer[];   // 该 Agent 已配置的 MCP Servers
  configPaths: {             // 配置文件路径
    skills: string;
    mcp?: string;
  };
}
```

---

## 5. 发现命令

### 5.1 discover_skills

在线搜索和发现 Skills。

```rust
#[tauri::command]
async fn discover_skills(
    query: String,
    channel: Option<String>,
    page: Option<u32>,
    per_page: Option<u32>,
) -> Result<DiscoverResult, CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | `string` | 是 | 搜索关键词 |
| `channel` | `string?` | 否 | `"github"` / `"skills-sh"` / `"well-known"` |
| `page` | `u32?` | 否 | 页码（默认 1） |
| `per_page` | `u32?` | 否 | 每页数量（默认 20，最大 100） |

**返回**:

```typescript
interface DiscoverResult {
  skills: DiscoveredSkill[];
  total: number;
  page: number;
  hasMore: boolean;
}

interface DiscoveredSkill {
  name: string;
  description: string;
  author: string;
  source: Source;
  stars?: number;
  downloads?: number;
  tags: string[];
  safetyRating: 'safe' | 'caution' | 'warning';
}
```

---

### 5.2 get_featured_skills

获取官方精选 Skills。

```rust
#[tauri::command]
async fn get_featured_skills() -> Result<Vec<DiscoveredSkill>, CommandError>
```

---

## 6. 系统命令

### 6.1 get_app_config

获取应用配置。

```rust
#[tauri::command]
async fn get_app_config() -> Result<AppConfig, CommandError>
```

**返回**:

```typescript
interface AppConfig {
  defaultMode: 'symlink' | 'copy';
  defaultScope: 'global' | 'project';
  updateInterval: number;        // 小时
  cacheTTL: number;              // 小时
  githubToken?: string;
  theme: 'dark' | 'light';
  proxy?: string;
  customAgentRegistry?: string;
  sourceAliases: Record<string, string>;
}
```

---

### 6.2 update_app_config

更新应用配置。

```rust
#[tauri::command]
async fn update_app_config(
    config: serde_json::Value,
) -> Result<AppConfig, CommandError>
```

---

### 6.3 export_config

导出配置（Skills Lock + MCP 配置）。

```rust
#[tauri::command]
async fn export_config(
    format: String,
    path: String,
    include_secrets: Option<bool>,
) -> Result<String, CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `format` | `string` | 是 | `"json"` / `"txt"` |
| `path` | `string` | 是 | 导出文件路径 |
| `include_secrets` | `boolean?` | 否 | 是否包含 MCP 敏感值；默认 `false`，即导出脱敏值 |

**说明**:
- 当 `include_secrets = false` 或省略时，导出的 MCP `env`、`headers`、token、password 字段会以脱敏占位值输出。
- 当前命令适用于普通配置迁移；完整压缩包备份使用 `create_backup`。

---

### 6.4 import_config

导入配置。

```rust
#[tauri::command]
async fn import_config(
    path: String,
) -> Result<ImportResult, CommandError>
```

**返回**:

```typescript
interface PendingMCPSecretInput {
  serverName: string;
  fields: string[];         // 例如 ["env.API_KEY", "headers.Authorization"]
}

interface ImportResult {
  skillsImported: number;
  mcpImported: number;
  pendingSecrets: PendingMCPSecretInput[];
  errors: string[];
}
```

**说明**:
- 当导入文件中的 MCP 配置包含脱敏占位值时，后端会导入非敏感配置，并将缺失敏感字段返回在 `pendingSecrets` 中。
- 前端应提示用户补录这些字段，补录完成前对应 MCP Server 的 `syncStatus` 应保持 `pending`。

---

### 6.5 create_backup

创建完整备份压缩包（Skills Lock + MCP 配置 + 应用配置快照）。

```rust
#[tauri::command]
async fn create_backup(
    path: String,
    include_secrets: Option<bool>,
) -> Result<String, CommandError>
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | `string` | 是 | 备份压缩包输出路径 |
| `include_secrets` | `boolean?` | 否 | 是否包含 MCP 敏感值；默认 `false` |

---

### 6.6 restore_backup

从备份压缩包恢复 Skills 和 MCP 配置。

```rust
#[tauri::command]
async fn restore_backup(
    path: String,
) -> Result<ImportResult, CommandError>
```

**说明**:
- 返回结构与 `import_config` 相同。
- 若备份包中的 MCP 敏感值经过脱敏，恢复后也会通过 `pendingSecrets` 通知前端补录。

---

### 6.7 get_logs

获取操作日志。

```rust
#[tauri::command]
async fn get_logs(
    level: Option<String>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<LogResult, CommandError>
```

**返回**:

```typescript
interface LogResult {
  logs: LogEntry[];
  total: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  details?: string;
}
```

---

### 6.8 handle_deep_link

处理深度链接。

```rust
#[tauri::command]
async fn handle_deep_link(
    url: String,
) -> Result<DeepLinkAction, CommandError>
```

**返回**:

```typescript
interface DeepLinkAction {
  type: 'install';
  source: string;
  resolvedSkills: ResolvedSkill[];  // 预解析结果
}
```

---

## 7. 事件（Events）

前端通过 `listen()` 监听的 Tauri 事件：

| 事件名 | Payload | 说明 |
|--------|---------|------|
| `install-progress` | `{ step, progress, total }` | 安装进度 |
| `update-available` | `{ name, currentHash, latestHash }` | 检测到更新 |
| `agent-status-changed` | `{ agent, installed }` | Agent 状态变更 |
| `deep-link-received` | `{ url }` | 收到深度链接 |
| `mcp-connection-status` | `{ serverId, agent, status }` | MCP 连接状态变更（按 Agent）|

**注意**: MCP 配置直接写入 Agent 配置文件，无同步状态事件。配置变更通过命令返回值确认。

---

*相关文档: [系统设计](../02-architecture/SYSTEM-DESIGN.md) · [PRD](../01-requirements/PRD.md) · [开发指南](../05-development/DEV-GUIDE.md)*
