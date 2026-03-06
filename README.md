# Skills Manager

用于统一管理 AI Agent Skills 与 MCP Servers 的本地优先桌面应用。

> 说明
> 仓库、代码与文档当前主要使用 `Skills Manager` 命名；桌面打包产物在现有 Tauri 配置中显示为 `Skills Hub`。本文档统一使用仓库名 `Skills Manager` 描述项目。

## 项目简介

`Skills Manager` 是一个基于 `Tauri 2 + React + Rust` 的桌面应用，目标是把分散在不同 AI Agent 里的两类能力统一管理起来：

- `Skills`：面向 Agent 的可复用能力包、指令集或工作流模板
- `MCP Servers`：面向 Agent 的工具接入层与外部能力扩展

项目聚焦三个实际问题：

- 不同 Agent 的 skills 目录和 MCP 配置格式不一致，手动维护成本高
- 本地文件被手动修改、删除或迁移后，工具状态容易和真实磁盘脱节
- 现有方案通常只解决 `Skills` 或 `MCP` 其中一半，缺少统一视角

## 核心能力

- 统一管理 Skills：安装、查看、筛选、更新、移除、重新导入
- 统一管理 MCP：新增、编辑、删除、按 Agent 绑定、导入现有配置
- 本地优先：所有索引、缓存和注册表都保存在本机
- 多 Agent 适配：内置 `40+` Agent 注册表与路径规则
- 覆盖式导入：重新导入时以本地磁盘为准，清理残留索引
- 可视化分组：按 Skill、按 Agent、按目录/配置文件双视角查看
- 桌面打包：基于 Tauri 生成原生桌面产物

## 为什么这个项目有价值

对个人开发者，它减少“每个 Agent 都要单独维护一份配置”的重复劳动。  
对团队，它提供了一个更清晰的本地配置入口，便于统一约定、排查问题和逐步标准化 Agent 使用方式。

和纯 CLI 工具相比，这个项目更强调：

- 本地状态可见
- 目录/配置差异可见
- 导入与重建行为可见
- 多 Agent 管理可见

## 当前技术栈

| 层级 | 技术 |
| --- | --- |
| Desktop Shell | Tauri 2 |
| Frontend | React 18, TypeScript 5, Vite 5 |
| Styling | Tailwind CSS |
| State | Zustand |
| Backend | Rust 2021, Tokio, Serde |
| Package Manager | pnpm workspace |
| Build Entry | `Makefile` + `pnpm tauri build` |

## 仓库结构

```text
.
├── apps/
│   └── desktop/              # Tauri 桌面应用
│       ├── src/              # React 前端
│       └── src-tauri/        # Rust 后端
├── packages/
│   └── core/                 # 共享类型与前端契约
├── skills-docs/              # 正式项目文档中心
├── Makefile                  # 常用开发/构建命令
├── package.json              # Monorepo 入口
└── pnpm-workspace.yaml
```

## 快速开始

### 1. 环境要求

- `Node.js` 20+
- `pnpm`
- `Rust` / `cargo`
- macOS 下需安装 Xcode Command Line Tools

### 2. 安装依赖

```bash
make install
```

或：

```bash
pnpm install
```

### 3. 本地开发

```bash
make dev
```

常用命令：

```bash
make help
make dev
make check
make build
```

### 4. 构建桌面应用

```bash
make build
```

当前 macOS 打包产物默认输出到：

```text
apps/desktop/src-tauri/target/release/bundle/dmg/
```

## 文档入口

正式文档集中在 [skills-docs/README.md](./skills-docs/README.md)。

推荐阅读顺序：

1. [项目概览](./skills-docs/00-overview/PROJECT-OVERVIEW.md)
2. [开发指南](./skills-docs/05-development/DEV-GUIDE.md)
3. [系统设计](./skills-docs/02-architecture/SYSTEM-DESIGN.md)
4. [Tauri Commands](./skills-docs/04-api/TAURI-COMMANDS.md)

说明：

- `skills-docs/` 是当前的正式文档目录
- `apps/desktop/*.md` 下多数文件更偏阶段性实现笔记或专题说明，不应视为统一入口

## 开发约定

- 前端构建：`pnpm --filter desktop build`
- Rust 检查：`cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`
- 根目录打包：`make build`
- 文档入口：优先维护根 `README.md` 与 `skills-docs/README.md`

## 项目状态

当前仓库处于 `v0.3.0` 的持续迭代阶段，适合：

- 本地开发
- 功能验证
- UI / 数据模型演进
- 作为 Skills + MCP 管理工具的基础仓库继续扩展

尚未补齐的开源基础设施包括：

- `LICENSE`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- CI 状态徽章与发布流水线说明

如果计划正式对外开源，建议先补齐这些元信息。

## 适合贡献的方向

- Agent 检测与注册表完善
- Skills 导入 / 重建 / 冲突策略
- MCP 配置导入、分组与同步体验
- 文档体系、安装说明、发布流程
- 测试覆盖率和平台兼容性

## 常见命令

```bash
make help          # 查看所有命令
make install       # 安装依赖
make dev           # 启动桌面开发环境
make check         # 前后端检查
make build         # 打包桌面应用
make clean         # 清理构建产物
```

## 开源说明

本仓库正在向“可公开协作的工程化项目”整理，但目前尚未附带开源许可证文件。  
在 `LICENSE` 正式落地前，请不要假定其具有标准开源分发授权。
