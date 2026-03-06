# 变更历史

**文档编号**: SM-OV-003
**版本**: 0.3.0
**状态**: 草案
**最后更新**: 2026-03-01

---

## 版本历史

### v0.3.0 — 2026-03-01

**重大更新：融合 Vercel Skills + cc-switch 双方案优势**

#### 架构变更
- **新增**: `MCPEngine` — MCP Server 统一管理引擎（CRUD + 格式转换 + Per-App Toggle）
- **新增**: `FormatConverter` — JSON/TOML/YAML 自动互转，支持 Claude、Cursor、Codex、Gemini 等 Agent 配置格式
- **新增**: `ProviderRegistry` — 可扩展的来源 Provider 系统（GitHub、GitLab、Local、WellKnown、Zip）
- **新增**: `DeepLinkHandler` — `skillsmanager://install?source=...` 深度链接处理
- **升级**: 双 Lock 文件架构 — 全局 Lock（`~/.agents/.skill-lock.json`，tree SHA）+ 项目 Lock（`skills-lock.json`，SHA-256）
- **升级**: Agent 支持从 40+ 扩展至 42+，新增 universal / non-universal 分类
- **升级**: 双引擎架构 — Skills Engine + MCP Engine 独立运作，共享基础设施

#### 文档变更
- **更新**: `PROJECT-OVERVIEW.md` — 新增 MCP 管理、Provider 系统、深度链接等定位描述
- **更新**: `GLOSSARY.md` — 新增 MCP 相关术语、发现与分发术语、Provider 术语
- **更新**: `PRD.md` — 新增 FR-006~FR-009（MCP 管理）、FR-016~FR-019（深度链接、ZIP 导入、Provider、安全审计）
- **更新**: `SYSTEM-DESIGN.md` — 双引擎架构图、MCP 类型系统、Provider 类型、Lock 类型、FormatConverter、ProviderRegistry
- **更新**: `UI-DESIGN-SPEC.md` — MCP 管理页、MCP 卡片组件、添加/编辑 Modal、深度链接落地页、Agent 颜色扩展
- **新增**: `TAURI-COMMANDS.md` — 完整 Tauri Commands API 文档（Skills/MCP/Agent/Discovery/System 共 25+ 命令）
- **新增**: `DEV-GUIDE.md` — 开发环境搭建、编码规范、测试策略、构建发布流程

#### 功能需求变更

| FR | 变更类型 | 说明 |
|----|---------|------|
| FR-002 | 更新 | 安装来源从 8 种扩展至 12+ 种，通过 Provider 系统统一处理 |
| FR-005 | 更新 | Agent 支持升级至 42+，新增 universal/non-universal 分类 |
| FR-006 | 新增 | MCP Server 列表展示 |
| FR-007 | 更新 | MCP Server 增删改查 + 格式转换 |
| FR-008 | 新增 | MCP 格式自动转换（JSON ↔ TOML ↔ YAML） |
| FR-009 | 新增 | MCP Per-App Toggle（独立启用/禁用到每个 Agent） |
| FR-013 | 更新 | 从单 Lock 升级为双 Lock 文件（全局 + 项目） |
| FR-016 | 新增 | 深度链接支持（`skillsmanager://` URL Scheme） |
| FR-017 | 新增 | ZIP 文件拖拽导入 |
| FR-018 | 新增 | Provider 插件机制（HostProvider 接口） |
| FR-019 | 新增 | 安全审计评级（Safe / Caution / Warning） |

#### 新增错误类型

| 错误码 | 说明 |
|--------|------|
| `AGENT_NOT_FOUND` | 目标 Agent 未安装 |
| `MCP_CONFIG_ERROR` | MCP 配置文件读写失败 |
| `PROVIDER_ERROR` | Provider 加载失败 |
| `RATE_LIMIT` | GitHub API 速率限制 |
| `LOCK_CONFLICT` | Lock 文件并发写入冲突 |

---

### v0.2.0 — 2026-03-01

**架构重大调整：完全自研，不依赖 Vercel CLI**

#### 文档变更
- 新增企业级文档目录结构（`00-overview/` ~ `05-development/`）
- 新增 `GLOSSARY.md` 术语表
- 新增 `CHANGELOG.md` 变更历史
- 重构 `PRD.md`：从依赖 CLI 调整为完全自研方案
- 新增 `SYSTEM-DESIGN.md`：详细的软件设计文档
- 新增 `UI-DESIGN-SPEC.md`：UI/UX 设计规范

#### 架构变更
- **移除**: 对 Vercel `npx skills` CLI 的依赖
- **新增**: 自研 `SkillEngine` 核心引擎
- **新增**: `SourceParser` — 支持多种 URL 格式解析
- **新增**: `GitManager` — 原生 Git 操作（基于 git2-rs）
- **新增**: `LockManager` — Lock 文件读写管理
- **新增**: `AgentManager` — 多 Agent 自动检测与配置
- **新增**: Skill 发现策略文档（GitHub API + 社区索引 + 本地缓存）

#### 功能需求变更
| FR | 变更类型 | 说明 |
|----|---------|------|
| FR-002 | 更新 | 安装来源新增 ZIP 文件支持 |
| FR-005 | 更新 | Agent 支持从 8 个扩展至 40+ |
| FR-007 | 新增 | Skill 在线发现功能（GitHub API 搜索）|
| FR-013 | 新增 | 备份与恢复功能需求 |

---

### v0.1.0 — 2026-03-01

**初始版本（依赖 Vercel CLI）**

#### 文档变更
- 初始化 `REQUIREMENTS.md`（PRD 草案）
- 初始化 `DESIGN.md`（架构草案，依赖 Vercel CLI）
- 初始化 `UI_DESIGN.md`（UI/UX 设计规范）

#### 方案说明
- 前端 React + TypeScript + Tauri 2.x
- 后端调用 `npx skills` CLI 执行核心操作
- 原生 GUI 封装命令行工具

> 该方案因 Node.js 依赖问题在 v0.2.0 中被废弃

---

## 未来版本计划

| 版本 | 状态 | 里程碑 |
|------|------|--------|
| v1.0.0-alpha | 计划中 | MVP：Skills 安装/卸载/列表 + 多 Agent 支持 + MCP 基础管理 |
| v1.0.0-beta | 计划中 | 发现页面 + 在线搜索 + 更新检查 + MCP 格式转换 |
| v1.0.0 | 计划中 | 正式发布：备份/恢复 + 导入/导出 + 安全审计 + 深度链接 |
| v1.1.0 | 规划中 | 团队协作 + 私有 Registry + Provider WASM 插件 |
| v1.2.0 | 规划中 | MCP Marketplace + 在线 MCP 发现 + 自动更新 |

---

*相关文档: [项目概述](./PROJECT-OVERVIEW.md) · [PRD](../01-requirements/PRD.md) · [系统设计](../02-architecture/SYSTEM-DESIGN.md)*
