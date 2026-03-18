# 系统架构设计文档 (SDD)

**文档编号**: SM-ARCH-001
**版本**: 0.3.0
**状态**: 草案
**最后更新**: 2026-03-01
**架构**: 完全自研（Core Engine + Tauri Frontend）

---

## 1. 架构概述

### 1.1 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 桌面框架 | Tauri | 2.x | 跨平台桌面应用外壳 |
| 前端框架 | React | 18.x | UI 界面渲染 |
| 前端语言 | TypeScript | 5.x | 类型安全的前端逻辑 |
| 后端语言 | Rust | 1.75+ | Tauri 命令实现，高性能系统操作 |
| 构建工具 | Vite | 5.x | 前端构建与热重载 |
| 状态管理 | Zustand | 4.x | 轻量前端状态容器 |
| 样式系统 | Tailwind CSS | 3.x | 原子化 CSS |
| UI 组件库 | shadcn/ui | latest | 基于 Radix UI 的可访问组件，代码复制模式 |
| Git 操作 | git2-rs | latest | 原生 Rust Git 库，无 Node 依赖 |
| 异步运行时 | tokio | 1.x | 异步文件系统与网络操作 |
| 序列化 | serde | 1.x | JSON/TOML/YAML 格式转换 |

### 1.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      桌面应用层 (Tauri 2.x)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    前端 (React + TypeScript)              │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │  Pages   │ │Components│ │  Stores  │ │  Hooks   │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  └─────────────────────┬───────────────────────────────────┘    │
│                         │  invoke() / emit()                     │
│  ┌──────────────────────┼──────────────────────────────────┐    │
│  │               Tauri Commands (Rust Bridge)               │    │
│  │  skills::* · mcp::* · agents::* · system::*              │    │
│  │                                                           │    │
│  │  业务逻辑全部在 Rust 中实现，packages/core 仅提供编译时类型  │    │
│  └──────────────────────┬──────────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                Rust 实现层（src-tauri 内部模块）                   │
│                                                                   │
│  ┌──────────────────────┼───────────────────────────────┐       │
│  │              Skills Engine                            │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │       │
│  │  │ Install  │ │  Update  │ │  Remove  │ │  Search │ │       │
│  │  │ Manager  │ │ Manager  │ │ Manager  │ │ Manager │ │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                MCP Engine                             │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │       │
│  │  │  Config  │ │  Format  │ │  Sync    │ │  Guard  │ │       │
│  │  │  CRUD    │ │ Converter│ │  Manager │ │  Check  │ │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              共享基础设施                               │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │       │
│  │  │ Provider │ │  Source  │ │   Lock   │ │  Agent  │ │       │
│  │  │ Registry │ │  Parser  │ │  Manager │ │ Manager │ │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │       │
│  │  │   Git    │ │ DeepLink │ │  Config  │             │       │
│  │  │ Manager  │ │ Handler  │ │ Manager  │             │       │
│  │  └──────────┘ └──────────┘ └──────────┘             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                    数据层                              │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │       │
│  │  │ Git Repo │ │  Files   │ │   Lock   │ │  Agent  │ │       │
│  │  │  Cache   │ │ (Symlink │ │  Files   │ │ Config  │ │       │
│  │  │          │ │  /Copy)  │ │(Global+  │ │ Files   │ │       │
│  │  │          │ │          │ │ Project) │ │(JSON/   │ │       │
│  │  │          │ │          │ │          │ │TOML/YAML│ │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 核心设计原则

1. **本地优先**: 所有数据本地存储，最小化网络依赖
2. **零 Node 依赖**: Rust 原生实现 Git 操作，无需 Node.js 运行时
3. **前后端分离**: Tauri Command 作为清晰的接口边界
4. **可扩展性**: Provider 模式支持来源扩展，Agent Registry 支持 Agent 扩展
5. **双引擎架构**: Skills Engine + MCP Engine 独立运作，共享基础设施
6. **原子操作**: 所有写入操作保证原子性（临时文件 + rename）

---

## 2. 项目结构

```
skills-manager/
├── packages/
│   └── core/                          # 共享类型与前端适配辅助（TypeScript，仅编译时复用）
│       ├── src/
│       │   ├── types/                # 公共类型定义
│       │   │   ├── index.ts
│       │   │   ├── skill.ts
│       │   │   ├── mcp.ts
│       │   │   ├── agent.ts
│       │   │   └── provider.ts
│       │   ├── commands/             # Tauri invoke 的 TS 契约包装
│       │   ├── events/               # 前端事件 payload 类型
│       │   └── utils/                # 轻量前端工具函数
│       └── package.json
│
├── apps/
│   └── desktop/                       # Tauri 桌面应用
│       ├── src/
│       │   ├── components/            # React 组件
│       │   │   ├── layout/            # 布局组件
│       │   │   ├── ui/                # shadcn/ui 组件（通过 CLI 复制）
│       │   │   ├── skills/            # Skills 相关组件
│       │   │   ├── mcp/               # MCP 相关组件
│       │   │   ├── agents/            # Agent 相关组件
│       │   │   ├── discover/          # 发现页组件
│       │   │   └── stats/             # 统计组件
│       │   ├── pages/                 # 页面组件
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Installed.tsx
│       │   │   ├── SkillDetail.tsx
│       │   │   ├── Discover.tsx
│       │   │   ├── MCPManager.tsx
│       │   │   ├── MCPDetail.tsx
│       │   │   ├── Agents.tsx
│       │   │   └── Settings.tsx
│       │   ├── hooks/                 # 自定义 Hooks
│       │   ├── stores/                # Zustand Stores
│       │   │   ├── skills.ts
│       │   │   ├── mcp.ts
│       │   │   ├── discover.ts
│       │   │   ├── agents.ts
│       │   │   └── ui.ts
│       │   └── lib/                   # 工具库（含 shadcn/ui utils）
│       └── src-tauri/                 # Rust 后端
│           ├── src/
│           │   ├── commands/          # Tauri Commands
│           │   │   ├── skills.rs
│           │   │   ├── mcp.rs
│           │   │   ├── agents.rs
│           │   │   └── system.rs
│           │   ├── services/          # Skills 与 MCP 主业务逻辑
│           │   ├── agent/             # Agent 检测与目录管理
│           │   ├── git/               # Git 操作（Rust）
│           │   │   ├── mod.rs
│           │   │   ├── clone.rs
│           │   │   └── utils.rs
│           │   ├── mcp/               # MCP 配置（Rust）
│           │   │   ├── mod.rs
│           │   │   ├── converter.rs   # 格式转换
│           │   │   └── guard.rs       # Guard 检查
│           │   ├── fs/                # 文件操作
│           │   │   └── mod.rs
│           │   ├── deeplink/          # 深度链接
│           │   │   └── mod.rs
│           │   └── main.rs
│           └── Cargo.toml
│
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. 核心数据模型

### 3.1 Skills 类型

```typescript
// packages/core/src/types/skill.ts

/** 单个 Agent 的安装记录（支持每个 Agent 独立的 scope 和 mode） */
export interface AgentInstallRecord {
  agent: AgentType;              // Agent 标识符
  scope: 'global' | 'project';  // 该 Agent 的安装作用域
  mode: 'symlink' | 'copy';     // 该 Agent 的安装模式
  installedPath: string;         // 实际安装路径
  installedAt: Date;             // 安装时间
}

/** 已安装的 Skill 信息 */
export interface Skill {
  id: string;                    // 唯一标识 (name-hash)
  name: string;                  // 显示名称
  description: string;           // 功能描述
  source: Source;                // 来源信息
  canonicalPath: string;         // Canonical Path（SSOT）
  version?: string;              // 版本号
  author?: string;               // 作者
  tags: string[];                // 分类标签
  installs: AgentInstallRecord[]; // 每个 Agent 的安装记录（含独立 scope/mode）
  updatedAt: Date;               // 最后更新时间
  treeSha?: string;              // GitHub tree SHA（全局 Lock 用）
  contentHash: string;           // SHA-256 内容哈希（项目 Lock 用）
  metadata?: SkillMetadata;      // 额外元数据
}

/** Skill 来源信息 */
export interface Source {
  type: 'github' | 'gitlab' | 'git' | 'local' | 'zip' | 'well-known' | 'npm';
  url: string;                   // 完整 URL 或本地路径
  subpath?: string;              // 仓库内子目录路径
  ref?: string;                  // branch / tag / commit
  provider?: string;             // 使用的 Provider 名称
}

/** 解析后的来源信息 */
export interface ParsedSource {
  type: Source['type'];
  owner?: string;                // GitHub/GitLab owner
  repo?: string;                 // 仓库名
  url: string;                   // 完整 URL
  subpath?: string;              // Skill 子路径
  ref?: string;                  // git ref
  skillName?: string;            // @ 语法指定的 skill 名称
}

/** 安装选项
 * 注意：mode 和 scope 可在安装后通过 agentBindings 为每个 Agent 独立覆盖 */
export interface InstallOptions {
  agents: AgentType[];                  // 目标 Agents
  mode: 'symlink' | 'copy';            // 默认安装模式（可被 agentBindings 覆盖）
  scope: 'global' | 'project';         // 默认安装作用域（可被 agentBindings 覆盖）
  agentBindings?: Partial<Record<AgentType, {  // 每个 Agent 的独立 scope/mode
    scope?: 'global' | 'project';
    mode?: 'symlink' | 'copy';
  }>>;
  ref?: string;                         // 指定 git ref
  subpath?: string;                     // 子目录
  force?: boolean;                      // 强制覆盖已存在
}
```

### 3.2 MCP 类型（Agent 附属配置）

MCP 配置直接属于 Agent，**无全局注册表**。配置直接存储在各 Agent 的配置文件中。

```typescript
// packages/core/src/types/mcp.ts

/** 单个 Agent 的 MCP Server 配置 */
export interface AgentMCPServer {
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  type: 'stdio' | 'sse' | 'http';  // 传输类型
  enabled: boolean;              // 是否启用
  connectionStatus?: 'connected' | 'disconnected' | 'error';  // 运行时连接状态
  config: MCPServerConfig;       // 配置详情
  createdAt: Date;
  updatedAt: Date;
}

/** MCP Server 具体配置 */
export type MCPServerConfig =
  | MCPStdioConfig
  | MCPSSEConfig
  | MCPHTTPConfig;

export interface MCPStdioConfig {
  type: 'stdio';
  command: string;               // 启动命令
  args?: string[];               // 命令参数
  env?: Record<string, string>;  // 环境变量
  cwd?: string;                  // 工作目录
}

export interface MCPSSEConfig {
  type: 'sse';
  url: string;                   // SSE 端点
  headers?: Record<string, string>;
}

export interface MCPHTTPConfig {
  type: 'http';
  url: string;                   // HTTP 端点
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
}

/** Agent 及其 MCP 配置列表（前端展示用） */
export interface AgentMCPList {
  agent: AgentType;
  agentDisplayName: string;
  configPath: string;            // Agent 配置文件路径
  format: 'json' | 'toml' | 'yaml';
  servers: AgentMCPServer[];
}

/** MCP 格式转换映射 */
export interface MCPFormatMapping {
  agent: AgentType;
  format: 'json' | 'toml' | 'yaml';
  configPath: string;
  configKey: string;             // 配置文件中 MCP 段的键名
}
```

### 3.3 Agent 类型

```typescript
// packages/core/src/types/agent.ts

/** 支持的 Agent 类型（部分列举，完整 42+ 见 Registry） */
export type AgentType =
  | 'claude-code'
  | 'cursor'
  | 'github-copilot'
  | 'openclaw'
  | 'codex'
  | 'gemini-cli'
  | 'cline'
  | 'continue'
  | 'windsurf'
  | 'zed'
  | 'universal'
  | string;  // 支持自定义 Agent

/** Agent 配置 */
export interface AgentConfig {
  type: AgentType;
  displayName: string;
  description?: string;
  category: 'universal' | 'non-universal';
  skillsDir: string;             // 项目级 Skills 相对路径
  globalSkillsDir: string;       // 全局 Skills 绝对路径
  detectCommand?: string;        // 可执行文件名（如 `claude` / `cursor`），运行时通过 `which` 检测
  detectPaths?: string[];        // 备用检测路径
  mcpConfig?: MCPFormatMapping;  // MCP 配置格式映射
}
```

### 3.4 Provider 类型

```typescript
// packages/core/src/types/provider.ts

/** Provider 接口 */
export interface HostProvider {
  name: string;
  displayName: string;

  /** 判断是否能处理该来源 */
  canHandle(source: string): boolean;

  /** 解析来源，返回可安装的 Skill 列表 */
  resolve(source: string): Promise<ResolvedSkill[]>;

  /** 拉取 Skill 到目标目录 */
  fetch(resolved: ResolvedSkill, targetDir: string): Promise<void>;

  /** 检查是否有更新 */
  checkUpdate(skill: Skill): Promise<UpdateInfo | null>;

  /** 搜索 Skills（可选） */
  search?(query: string, options?: SearchOptions): Promise<DiscoveredSkill[]>;
}

/** 解析后的 Skill 信息 */
export interface ResolvedSkill {
  name: string;
  description?: string;
  source: Source;
  provider: string;
}

/** 更新信息 */
export interface UpdateInfo {
  currentHash: string;
  latestHash: string;
  changelog?: string;
}
```

### 3.5 Lock 文件类型

```typescript
// packages/core/src/types/lock.ts

/** 全局 Lock 文件结构 */
export interface GlobalLockFile {
  version: 3;
  skills: Record<string, GlobalLockEntry>;
}

/** 全局 Lock 条目中，单个 Agent 的安装记录 */
export interface GlobalAgentInstallEntry {
  agent: AgentType;
  scope: 'global' | 'project';   // 该 Agent 安装的 scope
  mode: 'symlink' | 'copy';      // 该 Agent 安装的 mode
  installedPath: string;          // 实际安装路径
  installedAt: string;            // ISO 8601
}

export interface GlobalLockEntry {
  source: string;                // 简写来源，如 "github:user/repo"
  subpath?: string;
  treeSha: string;               // GitHub tree SHA（快速更新检测）
  installs: GlobalAgentInstallEntry[];  // 每个 Agent 的独立安装记录
}

/** 项目 Lock 文件结构 */
export interface ProjectLockFile {
  version: 1;
  skills: Record<string, ProjectLockEntry>;
}

/** 项目 Lock 条目中，单个 Agent 的安装记录 */
export interface ProjectAgentInstallEntry {
  agent: AgentType;
  scope: 'global' | 'project';
  mode: 'symlink' | 'copy';
  installedPath: string;
  installedAt: string;
}

export interface ProjectLockEntry {
  source: string;
  subpath?: string;
  contentHash: string;           // SHA-256 内容哈希（精确一致性）
  installs: ProjectAgentInstallEntry[];  // 每个 Agent 的独立安装记录
}
```

---

## 4. 业务类型约定与 Rust 实现参考

> **说明**: 以下接口定义仅为业务类型约定，供前端 TypeScript 和文档参考。实际业务逻辑全部由 Rust（`src-tauri`）实现，`packages/core` 只是编译时共享的类型库，不在运行时执行任何引擎逻辑。

### 4.1 Skills 服务契约（概念示意）

```typescript
// conceptual service contract; actual implementation lives in Rust src-tauri

export class SkillEngine {
  private providerRegistry: ProviderRegistry;
  private lockManager: LockManager;
  private agentManager: AgentManager;
  private sourceParser: SourceParser;

  async list(options?: ListOptions): Promise<Skill[]>
  async install(source: string, options: InstallOptions): Promise<Skill>
  async update(name: string, options?: UpdateOptions): Promise<Skill>
  async remove(name: string, options?: RemoveOptions): Promise<void>
  async searchInstalled(query: string): Promise<Skill[]>
  async checkUpdates(): Promise<UpdateInfo[]>
}
```

**install() 流程**:

```
1. SourceParser.parse(source)
   └─ 解析来源格式 → ParsedSource
2. ProviderRegistry.findProvider(parsedSource)
   └─ 匹配合适的 Provider
3. Provider.resolve(source)
   └─ 解析可安装的 Skill 列表
4. LockManager.checkExists(skillName)
   └─ 检查是否已安装（如已存在且非 force，抛出 SkillExistsError）
5. Provider.fetch(resolvedSkill, canonicalPath)
   └─ 拉取到 Canonical Path（~/.agents/skills/<name>/）
6. 解析 SKILL.md 元数据并校验
7. AgentManager.installTo(canonicalPath, installPlan)
   └─ 根据默认 scope/mode 与 agentBindings 生成每个 Agent 的最终安装计划
8. LockManager.addGlobal(entry) + LockManager.addProject(entry)
   └─ 基于 installs[] 同时更新全局 Lock 和项目 Lock
```

### 4.2 MCP 服务契约（概念示意）

**注意**: MCP 配置直接属于 Agent，**无全局注册表**。

```typescript
// conceptual service contract; actual implementation lives in Rust src-tauri

export class MCPEngine {
  private converter: FormatConverter;
  private guardChecker: GuardChecker;
  private agentManager: AgentManager;

  /** 按 Agent 查询其 MCP 配置 */
  async listByAgent(agent: AgentType): Promise<AgentMCPServer[]>

  /** 为指定 Agent 添加 MCP 配置 */
  async addToAgent(agent: AgentType, server: MCPServerInput): Promise<AgentMCPServer>

  /** 更新指定 Agent 的 MCP 配置 */
  async update(agent: AgentType, id: string, changes: Partial<MCPServerInput>): Promise<AgentMCPServer>

  /** 从指定 Agent 移除 MCP 配置 */
  async remove(agent: AgentType, id: string): Promise<void>

  /** 启用/禁用指定 Agent 的某个 MCP */
  async toggle(agent: AgentType, id: string, enabled: boolean): Promise<void>

  /** 从 Agent 配置文件导入 MCP 配置 */
  async importFromAgent(agent: AgentType): Promise<AgentMCPServer[]>

  /** 聚合查询所有 Agent 的 MCP（用于展示） */
  async listAllByAgents(): Promise<AgentMCPList[]>
}
```

**addToAgent() 流程**:

```
1. 验证输入参数并生成唯一 ID
2. GuardChecker.check(agent)
   └─ 验证目标 Agent 已安装
3. FormatConverter.toAgentFormat(server, mapping)
   └─ 将统一格式转换为该 Agent 所需格式
4. 读取 Agent 配置文件
5. 合并新的 MCP 配置到现有配置
6. 原子写入 Agent 配置文件（临时文件 + rename）
7. 返回添加的 MCP 配置
```

**与旧设计的区别**:
- ❌ 无 `~/.skills-manager/mcp-servers.json` 全局注册表
- ❌ 无 `syncStatus` / `lastSyncedAt` 等同步状态（直接写入 Agent 配置）
- ✅ MCP 配置直接读写各 Agent 的配置文件
- ✅ 每个 MCP 配置绑定到特定 Agent，不存在跨 Agent 共享

### 4.3 FormatConverter

```typescript
// conceptual contract; actual implementation lives in Rust src-tauri

export class FormatConverter {
  /** 统一内部格式 → Agent 专用格式 */
  toAgentFormat(server: MCPServer, mapping: MCPFormatMapping): string;

  /** Agent 配置文件 → 统一内部格式 */
  fromAgentFormat(content: string, mapping: MCPFormatMapping): MCPServer[];
}
```

**格式转换示例**:

```
内部统一格式（MCPServer）
  │
  ├─→ Claude (JSON):  { "mcpServers": { "name": { "command": "...", "args": [...] } } }
  ├─→ Cursor (JSON):  { "mcpServers": { "name": { "command": "...", "args": [...] } } }
  ├─→ Codex  (TOML):  [mcp.servers.name] \n command = "..." \n args = [...]
  ├─→ Gemini (JSON):  { "mcpServers": { "name": { ... } } }
  └─→ OpenCode(JSON): { "mcpServers": { "name": { ... } } }
```

### 4.4 ProviderRegistry

```typescript
// conceptual contract; actual implementation lives in Rust src-tauri

export class ProviderRegistry {
  private providers: HostProvider[] = [];

  register(provider: HostProvider): void;
  unregister(name: string): void;

  /** 根据来源字符串找到合适的 Provider */
  findProvider(source: string): HostProvider | null;

  /** 获取所有已注册 Provider */
  listProviders(): HostProvider[];
}
```

**Provider 匹配优先级**:

```
1. WellKnownProvider  — 匹配 /.well-known/skills.json URL
2. GitHubProvider     — 匹配 github.com URL 和 owner/repo 简写
3. GitLabProvider     — 匹配 gitlab.com URL
4. LocalProvider      — 匹配本地路径（./ 或 /）
5. ZipProvider        — 匹配 .zip 文件
```

### 4.5 SourceParser

解析多种格式的安装来源：

| 格式 | 示例 | 解析结果 |
|------|------|---------|
| `owner/repo` | `vercel/skills` | type=github, owner, repo |
| `owner/repo@skill` | `vercel/skills@pr-review` | 同上 + skillName |
| `owner/repo#branch` | `vercel/skills#main` | 同上 + ref |
| GitHub URL | `https://github.com/...` | 解析 owner/repo/subpath/ref |
| GitHub tree URL | `.../tree/main/skills/name` | 同上 + subpath |
| GitLab URL | `https://gitlab.com/...` | type=gitlab |
| Git SSH URL | `git@github.com:user/repo.git` | type=git |
| 本地路径 | `./my-skill` | type=local, url=绝对路径 |
| Well-Known | `https://example.com/.well-known/skills.json` | type=well-known |
| npm | `node_modules/@org/skill` | type=npm |

### 4.6 LockManager

```typescript
// packages/core/src/lock/index.ts

export class LockManager {
  private globalLock: GlobalLockFile;
  private projectLock: ProjectLockFile;

  /** 读取全局 Lock */
  async readGlobal(): Promise<GlobalLockFile>;

  /** 读取项目 Lock */
  async readProject(projectDir: string): Promise<ProjectLockFile>;

  /** 添加条目（同时更新双 Lock） */
  async add(entry: Skill): Promise<void>;

  /** 删除条目 */
  async remove(name: string): Promise<void>;

  /** 检查是否已存在 */
  async checkExists(name: string): Promise<boolean>;

  /** 原子写入 */
  private async atomicWrite(path: string, content: string): Promise<void>;
}
```

- 原子写入：写临时文件后 rename
- 按 key 排序保证 diff 友好
- 自动检测 version 并执行迁移

### 4.7 AgentManager

核心职责：Agent 检测和 Skills/MCP 目录管理

```typescript
// conceptual contract; actual implementation lives in Rust src-tauri

export class AgentManager {
  private registry: AgentRegistry;

  /** 检测本机已安装的 Agent */
  async detectInstalled(): Promise<AgentConfig[]>;

  /** 安装 Skill 到指定 Agent */
  async installSkillTo(
    canonicalPath: string,
    agent: AgentConfig,
    mode: 'symlink' | 'copy',
    scope: 'global' | 'project'
  ): Promise<void>;

  /** 从 Agent 目录移除 Skill */
  async removeSkillFrom(skillName: string, agent: AgentConfig): Promise<void>;

  /** 获取 Agent 的 MCP 配置文件路径 */
  getMCPConfigPath(agent: AgentConfig): string;
}
```

- **自动检测**: 通过 `which <detectCommand>` 或 `detectPaths` 判断 Agent 是否已安装
- **目录管理**: 按 Agent 类型和 scope 返回正确的 Skills 安装目录
- **可扩展**: 42+ Agent 通过 YAML Registry 配置驱动

### 4.8 DeepLinkHandler

```typescript
// packages/core/src/deeplink/handler.ts

export class DeepLinkHandler {
  /** 解析深度链接 URL */
  parse(url: string): DeepLinkAction;

  /** 执行深度链接动作 */
  async execute(action: DeepLinkAction): Promise<void>;
}

export interface DeepLinkAction {
  type: 'install';
  source: string;
  agents?: AgentType[];
  mode?: 'symlink' | 'copy';
}
```

Tauri 2.x 原生支持 URL Scheme 注册，无需额外配置。

### 4.9 GitManager

核心职责：管理本地 Git 仓库缓存（`~/.skills-manager/cache/`）

| 方法 | 说明 |
|------|------|
| `cloneOrPull(source)` | 首次 clone（shallow），已有则 pull |
| `checkout(ref)` | 切换到指定分支/tag/commit |
| `getTreeSha(source, path)` | 查询 GitHub tree SHA（用于全局 Lock） |
| `getContentHash(dir)` | 计算目录 SHA-256 哈希（用于项目 Lock） |
| `getCurrentHash(repoDir)` | 获取本地当前 commit hash |

### 4.10 MigrationManager

核心职责：扫描本地环境并导入存量配置。

**扫描流程**:
1.  **Registry Iterator**: 遍历所有已知 Agent 的 `platforms[current].globalDir`。
2.  **Skill Discovery**: 在目录下递归搜索 `SKILL.md` 文件。
3.  **Metadata Extraction**: 解析 frontmatter，若缺失则以目录名作为名称。
4.  **Lock Registration**: 
    - 创建 SSOT 软链接（若支持）。
    - 写入全局 Lock 文件，并将 source 标记为 `imported:local`。
5.  **MCP Extraction**: 
    - 读取 `mcpConfig.configPath`。
    - 使用 `FormatConverter.fromAgentFormat` 解析为统一对象列表。
    - 与全局 MCP 列表合并。

---

## 5. Tauri 后端（Rust Commands）

完整接口定义见 [Tauri Commands 文档](../04-api/TAURI-COMMANDS.md)。

### 5.1 Git 操作（Rust）

使用 `git2-rs` 原生库，无需系统 Git 命令：

```rust
// src-tauri/src/git/clone.rs
pub fn clone_or_pull(url: &str, target_dir: &Path) -> Result<Repository, git2::Error> {
    if target_dir.exists() {
        let repo = Repository::open(target_dir)?;
        // fetch + merge
    } else {
        // shallow clone (--depth 1)
        let mut builder = git2::build::RepoBuilder::new();
        builder.fetch_options(FetchOptions::new());
        builder.clone(url, target_dir)
    }
}
```

### 5.2 MCP 格式转换（Rust）

使用 `serde` 实现 JSON/TOML/YAML 互转：

```rust
// src-tauri/src/mcp/converter.rs
pub fn convert_to_format(
    server: &MCPServerConfig,
    format: ConfigFormat,
) -> Result<String, ConvertError> {
    match format {
        ConfigFormat::Json => serde_json::to_string_pretty(server),
        ConfigFormat::Toml => toml::to_string_pretty(server),
        ConfigFormat::Yaml => serde_yaml::to_string(server),
    }
}
```

### 5.3 Guard 检查（Rust）

```rust
// src-tauri/src/mcp/guard.rs
pub fn check_agent_installed(agent: &AgentConfig) -> Result<bool, GuardError> {
    // 1. 检查 detect_command（如 claude / cursor）
    if let Some(cmd) = &agent.detect_command {
        if Command::new("which").arg(cmd).status()?.success() {
            return Ok(true);
        }
    }
    // 2. 检查 detect_paths
    if let Some(paths) = &agent.detect_paths {
        for path in paths {
            if Path::new(path).exists() {
                return Ok(true);
            }
        }
    }
    Ok(false)
}
```

---

## 6. 前端状态管理

### 6.1 Store 架构

```
stores/
├── skills.ts      # 已安装 Skills 状态
├── mcp.ts         # MCP Server 状态
├── discover.ts    # 发现/搜索状态
├── agents.ts      # Agent 状态
└── ui.ts          # UI 状态（侧边栏、Modal 等）
```

### 6.2 Skills Store

```typescript
// apps/desktop/src/stores/skills.ts
interface SkillsState {
  skills: Skill[];
  isLoading: boolean;
  error: string | null;
  selectedAgent: AgentType | 'all';
  selectedScope: 'global' | 'project' | 'all';
  searchQuery: string;

  fetchSkills: () => Promise<void>;
  installSkill: (source: string, options: InstallOptions) => Promise<void>;
  removeSkill: (name: string) => Promise<void>;
  updateSkill: (name: string) => Promise<void>;
  checkUpdates: () => Promise<UpdateInfo[]>;
  setSelectedAgent: (agent: AgentType | 'all') => void;
  setSelectedScope: (scope: 'global' | 'project' | 'all') => void;
  setSearchQuery: (query: string) => void;
}
```

### 6.3 MCP Store

```typescript
// apps/desktop/src/stores/mcp.ts
interface MCPState {
  servers: MCPServer[];
  isLoading: boolean;
  error: string | null;

  fetchServers: () => Promise<void>;
  addServer: (server: MCPServerInput) => Promise<void>;
  updateServer: (id: string, changes: Partial<MCPServerInput>) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  toggleAgent: (serverId: string, agent: AgentType, enabled: boolean) => Promise<void>;
  importFromAgent: (agent: AgentType) => Promise<void>;
}
```

所有异步操作通过 `invoke()` 调用 Tauri Commands，响应结果直接更新 Store。

---

## 7. Skill 发现策略

### 7.1 数据来源优先级

```typescript
const providers: DiscoveryProvider[] = [
  new GitHubSearchProvider(),      // 1. GitHub Code Search API
  new SkillsShProvider(),          // 2. skills.sh 官方索引
  new WellKnownProvider(),         // 3. Well-Known 协议端点
  new LocalCacheProvider(),        // 4. 本地缓存（离线时）
];
```

### 7.2 GitHub 搜索

使用 GitHub Code Search API：`filename:SKILL.md {keyword}`

- 每次搜索最多返回 100 条结果
- 并发获取每个仓库的 star 数、描述、作者
- 结果本地缓存 24 小时
- 支持可选 GitHub Token（匿名 60/h vs Token 5000/h）

### 7.3 Well-Known 协议

遵循 RFC 8615 规范，通过 `/.well-known/skills.json` 端点发现 Skills：

```json
{
  "version": 1,
  "skills": [
    {
      "name": "pr-review",
      "description": "...",
      "source": "https://github.com/org/repo/tree/main/skills/pr-review"
    }
  ]
}
```

### 7.4 用户分层

| 用户类型 | 推荐方式 |
|---------|---------|
| 新手 | 发现页面浏览，官方精选 |
| 普通用户 | 发现页面关键词搜索 |
| 高级用户 | GitHub URL 快捷语法 |
| 开发者 | 本地目录 Symlink |
| 团队 | 项目 Lock 文件共享 + 配置导入 |
| 企业 | 私有 Registry + Well-Known 协议 |

---

## 8. MCP Server 发现策略

### 8.1 数据来源优先级

```typescript
const mcpProviders: MCPDiscoveryProvider[] = [
  new NpmRegistryProvider(),       // 1. npm Registry (@modelcontextprotocol/server-*)
  new MCPOfficialProvider(),       // 2. modelcontextprotocol.io 官方索引
  new GitHubTopicsProvider(),      // 3. GitHub Topics (topic:mcp-server)
  new CommunityProvider(),         // 4. 社区贡献列表
];
```

### 8.2 npm Registry 搜索

使用 npm Registry API 搜索 `@modelcontextprotocol/server-*` 包：

- 获取包的 name、description、version、downloads
- 解析 package.json 中的 keywords 和 repository
- 结果本地缓存 24 小时
- 支持按下载量、更新时间排序

### 8.3 MCP 官方索引

从 modelcontextprotocol.io 获取官方认证的 MCP Servers：

```json
{
  "version": 1,
  "servers": [
    {
      "name": "postgres-mcp",
      "description": "PostgreSQL database access",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "official": true,
      "supportedAgents": ["claude-code", "cursor"]
    }
  ]
}
```

### 8.4 统一发现页面

Skills 和 MCP Servers 共享同一个发现页面（`/discover`），通过标签切换：

- **Skills 标签**：显示可安装的 Skills，支持按 Agent 筛选
- **MCP 服务器标签**：显示可用的 MCP Servers，支持按类型（stdio/sse/http）筛选
- **统一搜索框**：跨 Skills 和 MCP 的全文搜索
- **统一筛选器**：热门、最新、官方认证、适用 Agent

---

## 8. 目录与文件约定

### 8.1 SSOT 路径与隔离

为了避免不同来源但同名的 Skill 发生冲突，Canonical Path 使用来源哈希进行隔离：

```
~/.agents/
├── skills/                      # Canonical Path (SSOT)
│   ├── g-vercel-skills-abc123/  # 格式: <provider_init>-<repo_slug>-<hash>
│   │   ├── pr-review/
│   │   └── ...
│   └── l-my-local-df456/
│       └── ...
└── .skill-lock.json             # 全局 Lock 文件
```

### 8.2 引用计数与卸载逻辑

为了防止卸载一个项目中的 Skill 导致其他项目或 Agent 的 Symlink 失效，全局 Lock 文件必须维护引用计数：

```json
{
  "skills": {
    "pr-review": {
      "canonicalPath": "...",
      "dependents": {
        "agents": ["claude-code", "cursor"],
        "projects": ["/path/to/project-a"]
      }
    }
  }
}
```

**卸载逻辑修订**:
1. 检查 `dependents` 列表。
2. 只有当 `dependents.agents` 和 `dependents.projects` 均为空时，才执行磁盘物理删除。
3. 否则，仅移除当前项目的引用标记。

### 8.3 Windows Symlink 降级策略

在 Windows 环境下，若由于权限不足（未开启开发者模式）导致 Symlink 创建失败，系统应执行以下逻辑：
1. 捕获 `PermissionDenied` 错误。
2. 弹出提示框，说明权限问题。
3. 提供“降级为 Copy 模式”或“以管理员权限重试”的选项。
4. 若用户选择 Copy 模式，在 Lock 文件中将该 Agent 的 `mode` 标记为 `copy`。

### 8.3 缓存目录

```
~/.skills-manager/
├── cache/                       # Git 仓库克隆缓存
│   ├── github-vercel-skills/
│   └── github-user-repo/
├── config.yaml                  # 应用配置
└── logs/                        # 操作日志
```

**注意**: MCP 配置**不**存储在 `~/.skills-manager/` 下，而是直接写入各 Agent 的配置文件（如 `~/.claude.json`、`~/.codex/config.toml` 等）。

---

## 9. 错误处理规范

| 错误类型 | 场景 | 处理策略 |
|---------|------|---------|
| `InvalidSourceError` | URL 格式无法识别 | 显示支持的格式示例 |
| `SkillExistsError` | 同名 Skill 已安装 | 提供覆盖/取消选项 |
| `SkillNotFoundError` | Lock 文件中不存在 | 提示可能已被手动删除 |
| `NetworkError` | GitHub API 不可达 | 重试按钮 + 离线提示 |
| `InvalidSkillError` | SKILL.md 格式无效 | 显示正确格式示例 |
| `PermissionError` | 无写权限 | 提示目标路径和权限需求 |
| `AgentNotFoundError` | 目标 Agent 未安装 | Guard 检查拦截 |
| `MCPConfigError` | MCP 配置文件读写失败 | 显示文件路径和修复建议 |
| `ProviderError` | Provider 加载失败 | 降级使用其他 Provider |
| `RateLimitError` | GitHub API 速率限制 | 提示配置 Token |
| `LockConflictError` | Lock 文件并发写入 | 重试 + 文件锁 |

---

## 10. UI 组件库使用指南

### 10.1 shadcn/ui 集成

Skills Manager 使用 **shadcn/ui** 作为 UI 组件库，基于以下原因：

1. **代码复制模式**：组件代码直接在项目中，完全可控
2. **基于 Radix UI**：无样式的可访问组件基础，符合 WAI-ARIA 标准
3. **Tailwind 深度集成**：与现有样式系统无缝配合
4. **TypeScript 原生支持**：类型安全
5. **暗色模式**：开箱即用的主题切换

### 10.2 初始化配置

```bash
# 在 apps/desktop 目录下初始化
cd apps/desktop
npx shadcn-ui@latest init

# 配置选项
✔ Which style would you like to use? › Default
✔ Which color would you like to use as base color? › Slate
✔ Would you like to use CSS variables for colors? › yes
```

生成的配置文件：
- `components.json`：shadcn/ui 配置
- `tailwind.config.js`：更新 Tailwind 配置
- `src/lib/utils.ts`：`cn()` 工具函数

### 10.3 推荐组件列表

| 组件 | 用途 | 安装命令 |
|------|------|----------|
| **Dialog** | 安装 Skill、添加 MCP Server Modal | `npx shadcn-ui@latest add dialog` |
| **Tabs** | 发现页面 Skills/MCP 切换 | `npx shadcn-ui@latest add tabs` |
| **Card** | Skill 卡片、MCP Server 卡片 | `npx shadcn-ui@latest add card` |
| **Badge** | Agent 标签（Claude、Cursor 等） | `npx shadcn-ui@latest add badge` |
| **Button** | 所有按钮 | `npx shadcn-ui@latest add button` |
| **Command** | 全局命令面板（Cmd+K） | `npx shadcn-ui@latest add command` |
| **Dropdown Menu** | 操作菜单 | `npx shadcn-ui@latest add dropdown-menu` |
| **Toast** | 通知提示 | `npx shadcn-ui@latest add toast` |
| **Form** | MCP 配置表单 | `npx shadcn-ui@latest add form` |
| **Select** | Agent 选择器 | `npx shadcn-ui@latest add select` |
| **Switch** | Per-App Toggle 开关 | `npx shadcn-ui@latest add switch` |
| **Progress** | 安装进度条 | `npx shadcn-ui@latest add progress` |
| **Separator** | 导航分组分隔线 | `npx shadcn-ui@latest add separator` |
| **Drawer** | Skill 详情侧边栏 | `npx shadcn-ui@latest add drawer` |

### 10.4 使用示例

**Skill 卡片组件**：

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Card className="hover:border-indigo-500 transition-colors cursor-pointer">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {skill.name}
          <Badge variant="secondary">SKILL</Badge>
        </CardTitle>
        <CardDescription>{skill.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {skill.installs.map(install => (
            <Badge key={install.agent} variant="outline">
              {install.agent}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

**安装 Skill Dialog**：

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function InstallSkillDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>安装 Skill</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>安装新 Skill</DialogTitle>
          <DialogDescription>
            支持 GitHub URL、本地路径等 12+ 种来源格式
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="github:vercel/skills/pr-review" />
        {/* 表单内容 */}
      </DialogContent>
    </Dialog>
  )
}
```

**发现页面 Tabs**：

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DiscoverPage() {
  return (
    <Tabs defaultValue="skills">
      <TabsList>
        <TabsTrigger value="skills">Skills</TabsTrigger>
        <TabsTrigger value="mcp">MCP 服务器</TabsTrigger>
      </TabsList>
      <TabsContent value="skills">
        {/* Skills 列表 */}
      </TabsContent>
      <TabsContent value="mcp">
        {/* MCP Servers 列表 */}
      </TabsContent>
    </Tabs>
  )
}
```

### 10.5 主题定制

在 `tailwind.config.js` 中定制主题色：

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // 自定义 Skills Manager 品牌色
        indigo: {
          500: '#6366f1',
          600: '#4f46e5',
        },
      },
    },
  },
}
```

### 10.6 可访问性最佳实践

shadcn/ui 基于 Radix UI，自动提供：

- ✅ 键盘导航（Tab、Enter、Escape）
- ✅ ARIA 属性（role、aria-label、aria-describedby）
- ✅ 焦点管理（Focus Trap、Focus Return）
- ✅ 屏幕阅读器支持

**额外建议**：
- 为所有交互元素提供清晰的 `aria-label`
- 使用语义化 HTML（`<button>` 而非 `<div onClick>`）
- 确保颜色对比度符合 WCAG AA 标准（4.5:1）

---

## 11. 变更历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 0.1.0 | 2026-03-01 | 初始版本（依赖 Vercel CLI） |
| 0.2.0 | 2026-03-01 | 完全自研，添加 Skill 发现策略 |
| 0.3.0 | 2026-03-01 | 融合双方案：新增 MCP Engine、Provider 系统、双 Lock 文件、深度链接、shadcn/ui 组件库 |

---

*相关文档: [PRD](../01-requirements/PRD.md) · [UI 设计规范](../03-design/UI-DESIGN-SPEC.md) · [Tauri Commands](../04-api/TAURI-COMMANDS.md) · [开发指南](../05-development/DEV-GUIDE.md)*
