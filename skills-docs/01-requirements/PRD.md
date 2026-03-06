# 产品需求文档 (PRD)

**文档编号**: SM-REQ-001
**版本**: 0.3.0
**状态**: 草案
**最后更新**: 2026-03-01
**架构**: 完全自研（Core Engine + Tauri Frontend）

---

## 1. 文档概述

### 1.1 目的

本文档定义 **Skills Manager** 产品的功能需求、非功能需求及用户界面规范，作为研发、测试和设计的基准文档。

### 1.2 范围

Skills Manager v1.0.0 的核心功能，涵盖 **Skills 安装/卸载/更新/发现** 和 **MCP Server 统一管理**，支持 42+ AI Agent。

### 1.3 变更历史

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| 0.1.0 | 2026-03-01 | 初始版本（依赖 Vercel CLI） |
| 0.2.0 | 2026-03-01 | 完全自研架构 |
| 0.3.0 | 2026-03-01 | 融合 Vercel Skills + cc-switch 优势，新增 MCP 管理、Provider 扩展、双 Lock 文件 |

### 1.4 关联文档

| 文档 | 说明 |
|------|------|
| [项目概述](../00-overview/PROJECT-OVERVIEW.md) | 背景、定位、路线图 |
| [术语表](../00-overview/GLOSSARY.md) | 术语定义 |
| [系统设计](../02-architecture/SYSTEM-DESIGN.md) | 技术架构与实现方案 |
| [UI 设计规范](../03-design/UI-DESIGN-SPEC.md) | 界面与交互设计 |
| [Tauri Commands](../04-api/TAURI-COMMANDS.md) | 接口定义 |

---

## 2. 用户画像

| 用户类型 | 特征 | 核心诉求 |
|---------|------|---------|
| 新手用户 | 首次接触 AI Agent Skills，不熟悉 CLI | 可视化浏览、一键安装、无需记命令 |
| 个人开发者 | 使用 1-2 个 AI Agent，有一定技术基础 | 快速安装常用 Skills，管理 MCP Server |
| 小型团队 | 2-5 人，使用不同 Agent | 统一配置、Lock 文件共享、批量操作 |
| 重度用户 | 使用多种 AI Agent，熟悉生态 | 跨 Agent 统一管理 Skills 和 MCP，批量同步 |
| Skill 开发者 | 自己编写 Skills | 本地 Symlink 安装、实时更新、深度链接导入 |
| 企业用户 | 私有 Registry 需求 | Provider 扩展、安全审计、私有部署 |

---

## 3. 功能需求

### 3.1 Skills 管理（P0）

#### FR-001 Skills 列表展示

- **描述**: 展示当前项目/全局已安装的所有 Skills
- **优先级**: P0
- **验收标准**:
  - 显示 Skill 名称、描述、版本（来自 SKILL.md frontmatter）
  - 显示安装时间、最后更新时间
  - 显示技能来源（GitHub URL / 本地路径）及来源类型图标
  - 显示已安装到的 Agent 列表（含 Agent 彩色标签）
  - 支持按 Agent 类型筛选
  - 支持按安装作用域切换（全局 / 项目级）
  - 按安装时间倒序排列
  - 显示更新可用状态徽章

#### FR-002 Skill 安装

- **描述**: 从多种来源安装 Skill，通过 Provider 系统支持可扩展的来源类型
- **优先级**: P0
- **支持来源**（12+ 种格式）:

  | 格式 | 示例 | 说明 |
  |------|------|------|
  | GitHub 简写 | `user/repo` | 自动搜索 skills 目录 |
  | GitHub 简写 + Skill | `user/repo@skill-name` | 指定子 Skill |
  | GitHub 简写 + 分支 | `user/repo#branch` | 指定分支 |
  | GitHub 完整 URL | `https://github.com/user/repo` | 完整 URL |
  | GitHub 子路径 URL | `https://github.com/user/repo/tree/main/skills/name` | 指定路径 |
  | GitLab URL | `https://gitlab.com/user/repo` | GitLab 仓库 |
  | Git URL | `git@github.com:user/repo.git` | SSH Git URL |
  | 本地路径 | `./my-local-skill` | 本地目录 |
  | ZIP 文件 | 文件上传 | 通过 GUI 拖拽上传 |
  | Well-Known | `https://example.com/.well-known/skills.json` | RFC 8615 协议 |
  | npm 包 | `node_modules/@org/skill` | 从 node_modules 扫描 |
  | Source Alias | `@my-alias` | 配置中预定义的别名 |

- **验收标准**:
  - 通过 `SourceParser` 统一解析所有来源格式
  - 支持安装到一个或多个 Agent（含全选）
  - 支持 symlink（推荐）或 copy 模式
  - 支持全局和项目级两种安装作用域
  - 安装前校验 `SKILL.md` 格式有效性
  - 显示实时安装进度（克隆 → 解析 → 安装 → 完成）
  - 安装成功后同时更新全局 Lock 和项目 Lock 文件
  - 同名 Skill 已存在时提供覆盖/取消选项
  - 安装失败时自动清理残留文件

#### FR-003 Skill 卸载

- **描述**: 删除已安装的 Skill
- **优先级**: P0
- **验收标准**:
  - 支持从单个或多个 Agent 移除
  - 支持选择是否清理 Canonical Path 中的共享缓存
  - 卸载前显示确认对话框（含影响范围提示）
  - 卸载后自动更新全局 Lock 和项目 Lock 文件
  - 批量卸载支持

#### FR-004 Skill 更新

- **描述**: 检查并更新已安装的 Skills
- **优先级**: P1
- **更新检测方式**:
  - GitHub 来源：比较 GitHub tree SHA 与本地 `treeSha`
  - Git 来源：比较远程最新 commit hash 与本地 `skillFolderHash`
  - 本地来源：比较 SHA-256 内容哈希
- **验收标准**:
  - 支持检查单个/全部 Skill 是否有更新
  - 支持单个或批量更新
  - 显示更新摘要（变更概述、版本差异）
  - 更新后同步到所有已安装的 Agent 目录
  - 更新后同时刷新全局 Lock 和项目 Lock

---

### 3.2 多 Agent 支持（P0）

#### FR-005 多 Agent 管理

- **描述**: 统一管理 42+ AI Agent 的 Skills，通过 Agent Registry 配置驱动
- **优先级**: P0
- **支持的 Agent（部分列表）**:

  | Agent 显示名称 | 标识符 | 分类 | 项目级路径 | 全局级路径 |
  |---------------|--------|------|-----------|-----------|
  | Claude Code | `claude-code` | non-universal | `.claude/skills/` | `~/.claude/skills/` |
  | Cursor | `cursor` | universal | `.agents/skills/` | `~/.cursor/skills/` |
  | GitHub Copilot | `github-copilot` | universal | `.agents/skills/` | `~/.copilot/skills/` |
  | OpenClaw | `openclaw` | non-universal | `skills/` | `~/.openclaw/skills/` |
  | Codex | `codex` | universal | `.agents/skills/` | `~/.codex/skills/` |
  | Gemini CLI | `gemini-cli` | universal | `.agents/skills/` | `~/.gemini/skills/` |
  | Cline | `cline` | universal | `.agents/skills/` | `~/.agents/skills/` |
  | Continue | `continue` | non-universal | `.continue/skills/` | `~/.continue/skills/` |
  | Windsurf | `windsurf` | non-universal | `.windsurf/skills/` | `~/.windsurf/skills/` |
  | Zed | `zed` | universal | `.agents/skills/` | `~/.agents/skills/` |
  | Universal | `universal` | universal | `.agents/skills/` | `~/.config/agents/skills/` |

  > 完整 42+ Agent 列表见 Agent Registry 配置文件。

- **Agent 分类**:
  - **non-universal**: 使用 Agent 特有的目录结构
  - **universal**: 使用通用 `.agents/skills/` 目录

- **验收标准**:
  - 启动时自动检测本机已安装的 Agent（通过 `which` 命令或配置路径检测）
  - 为每个 Agent 管理独立的 Skills 列表
  - 支持一键安装同一 Skill 到多个 Agent
  - Agent Registry 通过 YAML 配置驱动，支持用户自定义新增 Agent
  - 显示 Agent 在线/离线状态

---

### 3.3 MCP Server 管理（P0）

#### FR-006 MCP Server 列表

- **描述**: 展示当前配置的所有 MCP Server
- **优先级**: P0
- **验收标准**:
  - 显示 Server 名称、类型（stdio/sse/http）、启用状态
  - 显示已关联的 Agent 列表
  - 支持按 Agent 筛选
  - 支持按启用/禁用状态筛选
  - 实时显示连接状态（已连接/断开/错误）

#### FR-007 MCP Server 增删改

- **描述**: 添加、编辑、删除 MCP Server 配置
- **优先级**: P0
- **支持的传输类型**:

  | 类型 | 说明 | 配置字段 |
  |------|------|---------|
  | `stdio` | 本地进程 | command, args, env |
  | `sse` | Server-Sent Events | url, headers |
  | `http` | HTTP 端点 | url, headers, method |

- **验收标准**:
  - 提供可视化表单配置 MCP Server
  - 支持 JSON 源码编辑模式（高级用户）
  - 添加后自动写入对应 Agent 配置文件
  - 编辑时实时预览配置效果
  - 删除前显示确认对话框

#### FR-008 MCP 格式自动转换

- **描述**: 不同 Agent 使用不同 MCP 配置格式，自动互转
- **优先级**: P0
- **格式映射**:

  | Agent | 配置格式 | 配置文件路径 |
  |-------|---------|-------------|
  | Claude Code | JSON | `~/.claude.json` |
  | Cursor | JSON | `~/.cursor/mcp.json` |
  | Codex | TOML | `~/.codex/config.toml` |
  | Gemini CLI | JSON | `~/.gemini/settings.json` |
  | OpenCode | JSON | `~/.config/opencode/opencode.json` |

- **验收标准**:
  - 新增/修改 MCP Server 时自动转换为目标 Agent 格式
  - 格式转换不丢失信息
  - 支持反向导入（从已有 Agent 配置文件导入 MCP Server）

#### FR-009 MCP Per-App Toggle

- **描述**: MCP Server 可独立启用/禁用到每个 Agent
- **优先级**: P1
- **验收标准**:
  - 每个 MCP Server 对每个 Agent 有独立的启用/禁用开关
  - 禁用时从对应 Agent 配置文件中移除，但保留在全局配置中
  - 批量启用/禁用操作
  - Guard 检查：写入配置前验证 Agent 已安装
  - 同步失败时保留全局注册表记录，并展示每个 Agent 的同步错误状态

#### FR-009.1 MCP Server 发现

- **描述**: 在线发现和浏览可用的 MCP Servers
- **优先级**: P1
- **发现渠道**:

  | 渠道 | 说明 | 优先级 |
  |------|------|--------|
  | npm Registry | 搜索 `@modelcontextprotocol/server-*` 包 | 高 |
  | MCP 官方索引 | modelcontextprotocol.io 官方服务器列表 | 高 |
  | GitHub Topics | `topic:mcp-server` 标签搜索 | 中 |
  | 社区贡献 | 用户提交的第三方 MCP Servers | 低 |

- **验收标准**:
  - 显示 MCP Server 名称、描述、作者、下载量、评分
  - 支持按关键词搜索（数据库、文件系统、API 等）
  - 支持按类型筛选（stdio/sse/http）
  - 支持按热门/最新/官方认证筛选
  - 显示支持的 Agents
  - 一键添加到配置（自动填充 command/url 等字段）
  - 与 Skills 发现功能集成在统一的"发现"页面，通过标签切换

---

### 3.4 Skill 发现与搜索（P1）

#### FR-010 本地搜索

- **描述**: 搜索已安装的 Skills
- **优先级**: P1
- **验收标准**:
  - 支持按名称、描述、标签关键词搜索
  - 实时过滤，响应时间 < 100ms
  - 支持高亮匹配关键词

#### FR-011 在线发现

- **描述**: 通过多渠道发现新 Skills
- **优先级**: P1
- **发现渠道**:

  | 渠道 | 说明 | 优先级 |
  |------|------|--------|
  | GitHub Code Search | `filename:SKILL.md` + 关键词 | 高 |
  | skills.sh 社区索引 | 官方精选和社区提交 | 高 |
  | Well-Known 协议 | `/.well-known/skills.json` 端点 | 中 |
  | 本地缓存 | 离线时可浏览历史缓存 | 低 |

- **本地缓存**:
  - 缓存搜索结果，TTL 可配置（默认 24h）
  - 离线时可浏览历史缓存
- **验收标准**:
  - 显示 Skill 名称、描述、作者、Star 数、下载量
  - 支持按关键词搜索
  - 支持按热门/最新/官方精选/适用 Agent 筛选
  - 一键安装搜索结果中的 Skill
  - 分页加载，每页最多 100 条

#### FR-012 Skill 详情查看

- **描述**: 查看 Skill 的完整信息
- **优先级**: P1
- **显示内容**:
  - 渲染 SKILL.md（Markdown 渲染，支持代码高亮）
  - 安装路径、安装时间、更新时间
  - 关联的 Agents
  - 来源仓库链接
  - 文件列表
  - 安全审计信息（来源可信度评级）
- **验收标准**:
  - Markdown 正确渲染
  - 代码块语法高亮
  - 图片相对路径正确处理

---

### 3.5 数据管理（P0/P1）

#### FR-013 双 Lock 文件管理

- **描述**: 自动维护全局 Lock 和项目 Lock 两套锁文件
- **优先级**: P0
- **全局 Lock 文件** (`~/.agents/.skill-lock.json`):
  ```json
  {
    "version": 3,
    "skills": {
      "pr-review": {
        "source": "github:vercel-labs/skills-tree",
        "subpath": "review/pr-review",
        "treeSha": "abc123def456",
        "installs": [
          {
            "agent": "claude-code",
            "scope": "global",
            "mode": "symlink",
            "installedPath": "~/.claude/skills/pr-review",
            "installedAt": "2026-03-01T10:00:00Z"
          },
          {
            "agent": "cursor",
            "scope": "project",
            "mode": "copy",
            "installedPath": "./.agents/skills/pr-review",
            "installedAt": "2026-03-01T10:03:00Z"
          }
        ]
      }
    }
  }
  ```
- **项目 Lock 文件** (`skills-lock.json`):
  ```json
  {
    "version": 1,
    "skills": {
      "pr-review": {
        "source": "github:vercel-labs/skills-tree",
        "subpath": "review/pr-review",
        "contentHash": "sha256:e3b0c44298fc...",
        "installs": [
          {
            "agent": "claude-code",
            "scope": "project",
            "mode": "symlink",
            "installedPath": "./.claude/skills/pr-review",
            "installedAt": "2026-03-01T10:00:00Z"
          }
        ]
      }
    }
  }
  ```
- **验收标准**:
  - 安装/更新/卸载操作后自动维护双 Lock 文件
  - 全局 Lock 使用 GitHub tree SHA 用于快速更新检测
  - 项目 Lock 使用 SHA-256 内容哈希用于精确一致性校验
  - 项目 Lock 设计为 VCS 友好，可提交到 Git
  - 支持版本迁移（当 `version` 升级时自动迁移）
  - 原子写入（写临时文件后 rename）
  - 按 key 排序保证 diff 友好

#### FR-014 配置管理

- **描述**: 管理应用配置
- **优先级**: P1
- **配置项**:
  - 默认安装模式（symlink / copy）
  - 默认安装作用域（全局 / 项目级）
  - 自动检查更新间隔（小时）
  - 索引缓存 TTL（小时）
  - 代理设置（用于 GitHub API 访问）
  - GitHub Token（可选，提升 API 速率限制）
  - 主题（深色 / 浅色，默认深色）
  - 自定义 Agent Registry 路径
  - Source Alias 定义

#### FR-015 导入/导出

- **描述**: 导出和导入 Skills 及 MCP 配置，支持跨机器迁移
- **优先级**: P2
- **支持格式**:
  - `skills-lock.json`（完整配置，含元数据）
  - MCP 配置导入/导出（从已有 Agent 配置文件读取）
  - 纯 URL 列表（`.txt`，一行一个，简易分享）
- **验收标准**:
  - 导出包含所有元数据（Skills + MCP）
  - MCP 导出默认脱敏 `env`、`headers`、token、password 等敏感值，并提供显式“包含敏感值”确认开关
  - 导入时自动安装缺失 Skills 并配置 MCP Server
  - 跨平台兼容（路径自动适配）

---

### 3.6 深度链接与快捷导入（P1）

#### FR-016 深度链接

- **描述**: 支持通过 URL Scheme 一键导入 Skill
- **优先级**: P1
- **URL Scheme**: `skillsmanager://install?source=...`
- **安全预检逻辑**:
  - 禁止静默安装，必须通过 `DeepLinkLanding` 页面由用户手动确认。
  - 强制执行 `FR-019` 安全审计，显著展示安全评级（Safe / Caution / Warning）。
  - 若为 Warning 评级（如含有危险指令或来自未知来源），增加额外的确认步骤（输入 "confirm" 或点击确认 3 秒倒计时）。
- **验收标准**:
  - 注册 `skillsmanager://` URL Scheme（Tauri 原生支持）。
  - 解析 `source` 参数并展示专用的安全评级安装落地页。
  - 用户确认后执行安装流程。

#### FR-017 ZIP 文件导入

- **描述**: 通过 GUI 拖拽上传 ZIP 文件导入 Skill
- **优先级**: P1
- **验收标准**:
  - 支持拖拽 ZIP 文件到应用窗口
  - 支持点击上传按钮选择 ZIP 文件
  - 自动解压并校验 `SKILL.md` 格式
  - 解压到 Canonical Path 并按需创建 Symlink

---

### 3.7 Provider 扩展系统（P1）

#### FR-018 Provider 插件机制

- **描述**: 可扩展的来源提供器，支持新增来源类型
- **优先级**: P1
- **内置 Provider**:

  | Provider | 来源类型 | 说明 |
  |----------|---------|------|
  | `GitHubProvider` | GitHub 仓库 | 含 API 搜索、tree SHA 对比 |
  | `GitLabProvider` | GitLab 仓库 | 类似 GitHub |
  | `LocalProvider` | 本地目录 | Symlink/Copy |
  | `WellKnownProvider` | Well-Known 端点 | RFC 8615 协议 |
  | `ZipProvider` | ZIP 文件 | 解压导入 |

- **HostProvider 接口**:
  ```typescript
  interface HostProvider {
    name: string;
    canHandle(source: string): boolean;
    resolve(source: string): Promise<ResolvedSkill[]>;
    fetch(resolved: ResolvedSkill, targetDir: string): Promise<void>;
    checkUpdate(skill: InstalledSkill): Promise<UpdateInfo | null>;
  }
  ```

- **验收标准**:
  - 内置 5 种 Provider
  - 支持通过配置文件注册自定义 Provider
  - Provider 加载失败不影响其他 Provider 工作
  - 提供 Provider 开发文档和示例

---

### 3.8 安全审计（P2）

#### FR-019 安全审计

- **描述**: 安装 Skill 前的安全检查
- **优先级**: P2
- **审计维度**:
  - 来源可信度（GitHub Star 数、作者信誉、仓库年龄）
  - SKILL.md 格式合规性
  - 文件内容扫描（检测可疑模式：网络请求、环境变量读取等）
  - 权限需求评估
- **验收标准**:
  - 安装前显示安全评级（Safe / Caution / Warning）
  - 用户可选择忽略警告继续安装
  - 审计结果本地缓存

---

### 3.9 系统功能（P2）

#### FR-020 日志查看

- **描述**: 记录和展示操作日志
- **优先级**: P2
- **验收标准**:
  - 记录安装、更新、卸载、MCP 配置变更等关键操作
  - 支持按日志级别（info / warn / error）筛选
  - 支持导出日志文件
  - 支持清空日志

#### FR-021 备份与恢复

- **描述**: 一键备份和恢复 Skills 及 MCP 配置
- **验收标准**:
  - 导出所有配置（Skills Lock + MCP 配置）为压缩包
  - 备份导出默认脱敏 MCP 敏感值，可由用户显式选择包含本机敏感配置
  - 从备份压缩包恢复
  - 支持定期自动备份（可选开关）

### 3.10 迁移与导入功能（P0）

#### FR-022 系统扫描导入 (System Scan)

- **描述**: 自动发现并导入本机已手动安装的 Skills
- **验收标准**:
  - 扫描 `Agent Registry` 中定义的所有全局和项目路径。
  - 识别包含 `SKILL.md` 的目录。
  - 自动提取名称、描述、作者信息。
  - 将发现的 Skill 注册到全局 Lock 文件，建立 SSOT 链接。
  - 支持“一键导入全部”和“手动勾选导入”。

#### FR-023 MCP 反向同步 (Reverse MCP Import)

- **描述**: 从已有 Agent 配置文件中提取 MCP Server 列表
- **验收标准**:
  - 支持从 Claude Code (`~/.claude.json`)、Cursor (`mcp.json`) 等文件直接读取配置。
  - 自动识别传输类型并转换为内部统一格式。
  - 处理冲突：若名称相同但配置不同，由用户决定覆盖或另存为。
  - 导入成功后，该 Server 可被其他所有 Agent 共享。

---

## 4. 非功能需求

### 4.1 性能指标

| 指标 | 目标值 |
|------|--------|
| 应用启动时间 | < 2 秒 |
| Skills 列表加载 | < 300ms |
| 本地搜索响应 | < 100ms |
| Skill 安装速度 | 与原生 `git clone` 相当 |
| MCP 配置写入 | < 50ms |
| Agent 检测 | < 1 秒（并行检测） |
| 应用内存占用 | < 150MB |
| 应用安装包体积 | < 30MB |

### 4.2 平台兼容性

| 平台 | 版本要求 |
|------|---------|
| macOS | 10.15 Catalina+（Intel + Apple Silicon） |
| Windows | Windows 10 / Windows 11 |
| Linux | Ubuntu 20.04+、Debian、Fedora |

### 4.3 可靠性

- 操作失败时显示清晰的错误信息和修复建议
- 支持操作确认（删除前弹窗确认）
- 安装失败时自动清理残留文件
- 支持大仓库分段拉取（通过 `git fetch --depth` 分段）
- 安装操作原子性：全部完成或全部回滚
- MCP 配置写入原子性：写临时文件后 rename
- Guard 检查：写入 Agent 配置前验证 Agent 已安装

### 4.4 安全性

- 所有操作本地执行，不上传任何数据
- 安装 Skill 前显示来源信息（仓库 URL、作者、Star 数）
- 不执行 Skill 中的任何脚本，仅进行文件操作
- MCP Server 配置允许在本机 `mcp-servers.json` 中持久化 `env`、`headers`、token 等用于本机 Agent 同步的字段
- 导出、分享、备份 MCP 配置时默认脱敏敏感值；只有用户显式确认时才允许原样导出
- 支持 Git 签名验证（v1.x 可选功能）
- 安全审计评级系统（v1.0 后续版本）

### 4.5 可维护性

- 模块化架构，核心引擎与 UI 解耦
- Provider 插件化设计，支持独立扩展
- 完善的错误类型定义
- 详细的操作日志记录
- Agent Registry 通过 YAML 配置驱动，无需改代码
- MCP 格式转换器可独立测试

### 4.6 可访问性

- 支持键盘导航
- 高对比度颜色方案
- 交互元素最小点击区域 44×44px

---

## 5. 用户界面规范

### 5.1 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  侧边栏 (256px)           主内容区                           │
│  ┌─────────┐  ┌──────────────────────────────────────────┐  │
│  │ Logo    │  │  Header（固定）                            │  │
│  │ ──────  │  ├──────────────────────────────────────────┤  │
│  │ 仪表盘  │  │                                          │  │
│  │ 发现    │  │  内容区域                                 │  │
│  │         │  │                                          │  │
│  │ 管理    │  │                                          │  │
│  │ ·已安装 │  │                                          │  │
│  │ ·MCP    │  │                                          │  │
│  │         │  │                                          │  │
│  │ 系统    │  │                                          │  │
│  │ ·Agents │  │                                          │  │
│  │ ·设置   │  │                                          │  │
│  │ ──────  │  │                                          │  │
│  │ 状态栏  │  │                                          │  │
│  └─────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**导航分组说明**：
- **独立导航**：仪表盘（总览）、发现（Skills + MCP 统一浏览）
- **管理分组**：已安装 Skills、MCP 服务器（日常管理功能）
- **系统分组**：Agents 状态、设置（系统级配置）

### 5.2 页面定义

| 页面 | 路径 | 描述 |
|------|------|------|
| 仪表盘 | `/` | 统计概览（Skills、MCP、Agents）、快捷操作、最近活动、迁移扫描提示 |
| 已安装 Skills | `/installed` | 已安装 Skills 列表，支持按 Agent 筛选和搜索 |
| Skill 详情 | `/installed/:id` | Skill 完整信息，含 Markdown 渲染 |
| 发现 | `/discover` | **统一发现页面**：通过双标签切换浏览 Skills 和 MCP 服务器，支持搜索、筛选、排序 |
| MCP 管理 | `/mcp` | 已配置的 MCP Server 列表，支持启用/禁用、编辑、删除 |
| MCP 详情 | `/mcp/:id` | 单个 MCP Server 详情与编辑 |
| Agents | `/agents` | Agent 管理和检测状态 |
| 设置 | `/settings` | 应用全局设置 |

### 5.3 关键用户流程

#### 安装 Skill 流程

```
点击安装 → 输入来源（12+ 种格式）
→ Provider 自动识别来源类型
→ （可选）从来源中选择具体 Skill
→ 选择目标 Agent（多选，自动显示已检测 Agent）
→ 选择默认安装模式（symlink / copy）和默认作用域（全局 / 项目）
→ （可选）为特定 Agent 覆盖 mode / scope
→ 安全审计预检 → 确认安装 → 显示进度 → 完成
→ 双 Lock 文件自动更新
```

#### 添加 MCP Server 流程

```
进入 MCP 管理 → 点击添加
→ 选择传输类型（stdio / sse / http）
→ 填写配置（命令、参数、环境变量等）
→ 选择目标 Agent（多选 + Per-App Toggle）
→ Guard 检查 → 自动格式转换 → 写入 Agent 配置
→ 连接状态实时反馈
```

#### 发现并安装 Skill 流程

```
进入发现页 → 切换到 Skills 标签（默认）→ 输入关键词搜索
→ 浏览结果卡片 → 点击查看详情 → 预览 SKILL.md
→ 查看安全评级 → 点击安装 → 选择 Agent → 确认 → 完成
```

#### 发现并添加 MCP Server 流程

```
进入发现页 → 切换到 MCP 服务器标签
→ 浏览推荐/热门 MCP Servers → 搜索特定功能（如 "database"）
→ 点击 MCP Server 卡片查看详情
→ 查看配置示例和支持的 Agents
→ 点击"添加" → 自动填充配置 → 选择目标 Agent → 确认 → 完成
```

#### 深度链接导入流程

```
点击网页端安装按钮 → 触发 skillsmanager://install?source=...
→ 应用激活 → 显示安装确认页面
→ 展示来源信息和安全评级
→ 用户确认 → 执行标准安装流程
```

---

## 6. Skill 格式规范

### 6.1 SKILL.md 结构

```markdown
---
name: "skill-name"          # 唯一标识（必填）
description: "..."          # 功能描述（必填）
author: "author-name"       # 作者（可选）
tags: ["tag1", "tag2"]      # 分类标签（可选）
version: "1.0.0"            # 版本号（可选）
metadata:
  internal: true            # 设为 true 则隐藏（可选）
---

# Skill 正文内容...
```

### 6.2 必填字段校验规则

| 字段 | 规则 |
|------|------|
| `name` | 小写字母、数字、连字符，3-64 字符 |
| `description` | 非空字符串，最长 200 字符 |

---

## 7. 错误处理规范

| 错误类型 | 场景 | 用户提示 |
|---------|------|---------|
| `InvalidSourceError` | URL 格式无法识别 | 显示支持的格式示例列表 |
| `SkillExistsError` | 同名 Skill 已安装 | 提供覆盖/取消选项 |
| `SkillNotFoundError` | Lock 文件中不存在 | 提示可能已被手动删除 |
| `NetworkError` | GitHub API 不可达 | 重试按钮 + 离线模式提示 |
| `InvalidSkillError` | SKILL.md 格式无效 | 显示正确格式示例 |
| `PermissionError` | 无写权限 | 提示目标路径和权限需求 |
| `AgentNotFoundError` | 目标 Agent 未安装 | 提示安装 Agent 或选择其他 |
| `MCPConfigError` | MCP 配置文件读写失败 | 显示文件路径和修复建议 |
| `ProviderError` | Provider 加载失败 | 降级使用其他可用 Provider |
| `RateLimitError` | GitHub API 速率限制 | 提示配置 Token 或等待重置 |

---

## 8. 附录

### 8.1 参考资料

- [Vercel Skills CLI](https://github.com/vercel-labs/skills) — 概念参考（42+ Agent、Provider、双 Lock）
- [cc-switch](https://github.com/nicholasb4711/cc-switch) — 概念参考（MCP 管理、GUI、深度链接）
- [Agent Skills 规范](https://agentskills.io) — 跨 Agent 兼容性规范
- [Tauri 官方文档](https://tauri.app/)
- [skills.sh](https://skills.sh) — 社区 Skills 索引
- [RFC 8615](https://tools.ietf.org/html/rfc8615) — Well-Known URIs 规范

### 8.2 待决问题

| ID | 问题 | 状态 | 备注 |
|----|------|------|------|
| Q-001 | GitHub API 速率限制策略（匿名 60/h vs Token 5000/h） | 待定 | 推荐可选 Token 配置 |
| Q-002 | 是否支持私有 GitHub/GitLab 仓库？ | 待定 | v1.1.0 考虑 |
| Q-003 | MCP 配置文件路径是否需要用户自定义？ | 待定 | 当前使用各 Agent 默认路径 |
| Q-004 | Provider 插件是否支持动态加载（WASM）？ | 待定 | v1.1.0 评估 |

---

*相关文档: [项目概述](../00-overview/PROJECT-OVERVIEW.md) · [术语表](../00-overview/GLOSSARY.md) · [系统设计](../02-architecture/SYSTEM-DESIGN.md) · [UI 设计规范](../03-design/UI-DESIGN-SPEC.md) · [Tauri Commands](../04-api/TAURI-COMMANDS.md)*
