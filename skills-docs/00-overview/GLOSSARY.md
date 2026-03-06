# 术语表

**文档编号**: SM-OV-002
**版本**: 0.3.0
**状态**: 草案
**最后更新**: 2026-03-01

---

## 核心概念

| 术语 | 英文 | 定义 |
|------|------|------|
| **技能** | Skill | AI Agent 的可复用指令集，以包含 YAML frontmatter 的 `SKILL.md` 文件为入口，可含规则、模板、示例等资源 |
| **AI 助手** | Agent | AI 编程助手，如 Claude Code、Cursor、Codex 等，可加载 Skills 来获得专业能力扩展 |
| **MCP 服务器** | MCP Server | Model Context Protocol 工具服务，为 Agent 提供外部工具调用能力（如数据库、API、文件系统等） |
| **来源** | Source | Skill 的获取来源，支持 GitHub、GitLab、本地目录、ZIP、Well-Known、npm 包等 |
| **Provider** | Provider | 可扩展的来源提供器，实现 `HostProvider` 接口即可新增来源类型（如 GitHub、GitLab、私有 Registry） |
| **全局锁文件** | Global Lock | `~/.agents/.skill-lock.json`，记录全局已安装 Skills 元数据，含 GitHub tree SHA 用于更新检测 |
| **项目锁文件** | Project Lock | `skills-lock.json`，项目级安装记录，含 SHA-256 内容哈希，设计为可提交到 VCS |
| **符号链接** | Symlink | 安装模式之一（默认），从 Agent 目录创建指向 Canonical Path 的符号链接 |
| **复制** | Copy | 安装模式之一，将 Skill 文件完整复制到 Agent 目录，实现完全隔离 |
| **通用 Agent** | Universal | 通配 Agent 配置，使用 `.agents/skills/` 目录，适用于未明确支持的 Agent |
| **技能发现** | Skill Discovery | 通过 GitHub API、skills.sh 社区索引或 Well-Known 协议搜索并发现可安装 Skills 的功能 |

---

## 架构术语

| 术语 | 英文 | 定义 |
|------|------|------|
| **SSOT** | Single Source of Truth | 单一事实来源。Skill 的唯一主副本存放位置（Canonical Path），各 Agent 目录通过 Symlink 指向它 |
| **Canonical Path** | Canonical Path | Skill 的规范存储路径 `~/.agents/skills/<name>/`，作为 SSOT |
| **缓存目录** | Cache Directory | `~/.skills-manager/cache/`，存放克隆/拉取的 Git 仓库缓存 |
| **技能哈希** | Skill Hash | Skill 目录内容的散列值（GitHub tree SHA 或 SHA-256），用于检测更新 |
| **子路径** | Subpath | 仓库内 Skill 所在的相对路径，如 `skills/pr-review` |
| **安装作用域** | Install Scope | 分为项目级和全局级两种；项目级写入项目内的 Agent 相对目录（如 `.claude/skills/` 或 `.agents/skills/`），全局级写入 Agent 的全局目录（如 `~/.claude/skills/`） |
| **来源解析器** | Source Parser | 解析各种 URL 格式和本地路径的组件，输出标准化的 `ParsedSource` 对象 |
| **Tauri 命令** | Tauri Command | Rust 后端暴露给前端 React 调用的接口，通过 `invoke()` 调用 |
| **快捷语法** | Shorthand | `owner/repo@skill-name#branch` 简写格式，用于指定 GitHub 来源 |
| **来源别名** | Source Alias | 在应用配置（`AppConfig.sourceAliases`）中为常用来源设置简短别名 |

---

## MCP 相关术语

| 术语 | 英文 | 定义 |
|------|------|------|
| **MCP** | Model Context Protocol | AI Agent 与外部工具之间的标准化通信协议 |
| **MCP 服务器类型** | Server Type | `stdio`（本地进程）、`sse`（Server-Sent Events）、`http`（HTTP 端点）三种传输方式 |
| **格式转换** | Format Conversion | 不同 Agent 使用不同配置格式（Claude 用 JSON、Codex 用 TOML），需自动互转 |
| **Per-App Toggle** | Per-App Toggle | MCP Server 可独立启用/禁用到每个 Agent，互不影响 |
| **Guard 检查** | Guard Check | 写入 Agent 配置前检查该 Agent 是否已安装，避免创建无用配置文件 |

---

## 发现与分发术语

| 术语 | 英文 | 定义 |
|------|------|------|
| **Well-Known 协议** | Well-Known Protocol | RFC 8615 规范，通过 `/.well-known/skills.json` 端点发布可用 Skills 列表 |
| **Plugin Manifest** | Plugin Manifest | `.claude-plugin/marketplace.json` 格式，用于声明插件中包含的 Skills |
| **深度链接** | Deep Link | `skillsmanager://install?source=...` 格式的 URL，支持一键导入 Skill |
| **skills.sh** | skills.sh | 社区 Skills 索引服务，提供搜索 API 和精选推荐 |

---

## 文件格式

### SKILL.md 结构

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

### 全局锁文件 (`~/.agents/.skill-lock.json`)

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

### 项目锁文件 (`skills-lock.json`)

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

> 项目锁文件设计为 VCS 友好，可提交到 Git 供团队共享。

---

## 支持的 Source 格式

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

---

## Agent 标识符对照表

> 以下为常用 Agent 列表，完整版含 42+ Agent 详见 [Vercel Skills 注册表](../../vercel-skills/README.md)。

| Agent 显示名称 | `--agent` 标识符 | 分类 | 项目级路径 | 全局级路径 |
|---------------|-----------------|------|-----------|-----------|
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

**Agent 分类**:
- **non-universal**: 使用 Agent 特有的目录结构
- **universal**: 使用通用 `.agents/skills/` 目录

---

*相关文档: [项目概述](./PROJECT-OVERVIEW.md) · [PRD](../01-requirements/PRD.md)*
