# Skills Manager 开源版 - 需求文档 (PRD)
> ⚠️ **已归档** — 此文件为 v0.2.0 草案，已被 [01-requirements/PRD.md](./01-requirements/PRD.md) 取代，请勿参考。


**版本**: 0.2.0  
**日期**: 2026-03-01  
**状态**: 草案  
**架构**: 完全自研（不依赖 Vercel CLI）

---

## 1. 项目概述

### 1.1 背景
现有的 Vercel Skills CLI 提供了基础功能，但：
- 需要 Node.js 环境
- 命令行交互不够直观
- 功能扩展受限

本工具提供**完全自研**的图形化管理能力，参考 Vercel Skills 的核心概念，但独立实现。

### 1.2 目标用户
- 个人开发者
- 小型团队（2-5人）
- 使用多种 AI Agent 的用户

### 1.3 核心价值
- **可视化**: 图形界面替代命令行
- **多Agent管理**: 统一管理不同 AI Agent 的 skills
- **本地优先**: 数据完全本地存储，无需联网
- **零依赖**: 无需 Node.js，单文件可执行
- **简单易用**: 一键安装、更新、删除

---

## 2. 功能需求

### 2.1 核心功能

#### FR-001: Skills 列表展示
- **描述**: 显示已安装的所有 skills
- **优先级**: P0
- **验收标准**:
  - 展示 skill 名称、描述、版本
  - 按安装时间排序
  - 显示技能来源（GitHub/本地等）
  - 支持按 Agent 类型筛选

#### FR-002: Skill 安装
- **描述**: 从远程或本地安装 skill
- **优先级**: P0
- **支持来源**:
  - GitHub 仓库（支持子目录）
  - GitLab 仓库
  - 本地目录（symlink/copy 模式）
  - ZIP 文件
- **验收标准**:
  - 解析多种 URL 格式（支持 `@` 语法指定子 skill）
  - 支持安装到指定 Agent
  - 支持 symlink 或 copy 模式
  - 安装前验证 SKILL.md 格式
  - 显示安装进度

#### FR-003: Skill 卸载
- **描述**: 删除已安装的 skill
- **优先级**: P0
- **验收标准**:
  - 支持单个 skill 删除
  - 可选是否删除共享依赖
  - 删除前确认
  - 清理 lock 文件条目

#### FR-004: Skill 更新
- **描述**: 检查并更新 skills
- **优先级**: P1
- **更新检测方式**:
  - Git: 比较 commit hash
  - 本地: 比较文件修改时间
- **验收标准**:
  - 检查远程是否有更新
  - 支持单个或批量更新
  - 显示更新日志（可选）
  - 支持回滚到上一版本

#### FR-005: 多 Agent 支持
- **描述**: 管理多种 AI Agent 的 skills
- **优先级**: P0
- **支持的 Agent**:
  - Claude Code (`~/.claude/skills`)
  - Cursor (`~/.cursor/skills`)
  - GitHub Copilot
  - OpenClaw (`~/.openclaw/skills`)
  - Codex
  - Cline
  - Continue
  - Universal (`.agents/skills`)
- **Agent 配置**:
  ```yaml
  agents:
    claude-code:
      displayName: "Claude Code"
      skillsDir: "~/.claude/skills"
      globalSkillsDir: "~/.claude/skills"
      detectCmd: "which claude"
    cursor:
      displayName: "Cursor"
      skillsDir: ".cursor/skills"
      globalSkillsDir: "~/.cursor/skills"
      detectCmd: "which cursor"
  ```
- **验收标准**:
  - 自动检测已安装的 Agent
  - 为每个 Agent 管理独立的 skills
  - 支持一键安装到多个 Agent
  - Agent 配置可扩展

### 2.2 Skill 发现与搜索

#### FR-006: Skill 搜索（本地）
- **描述**: 搜索已安装的 skills
- **优先级**: P1
- **验收标准**:
  - 支持按名称搜索
  - 支持按描述内容搜索
  - 支持按标签搜索
  - 实时过滤（<100ms）

#### FR-007: Skill 发现（在线）
- **描述**: 发现并安装新 skills
- **优先级**: P1
- **发现渠道**:
  - GitHub API 搜索（`filename:SKILL.md`）
  - 社区索引（可选同步）
  - 手动输入 URL
- **索引缓存**:
  - 本地缓存发现的 skills
  - 定期自动更新（可配置）
  - 离线时可浏览缓存
- **验收标准**:
  - 支持关键词搜索
  - 显示 star 数、作者、描述
  - 支持按语言/标签筛选
  - 一键安装

#### FR-008: Skill 详情查看
- **描述**: 查看 skill 的详细信息
- **优先级**: P1
- **显示内容**:
  - 渲染 SKILL.md（支持 Markdown）
  - 安装路径
  - 安装时间、更新时间
  - 关联的 Agents
  - 版本历史（Git 来源）
  - 文件列表
- **验收标准**:
  - Markdown 正确渲染
  - 代码块语法高亮
  - 图片相对路径正确处理

### 2.3 数据管理

#### FR-009: Lock 文件管理
- **描述**: 管理 skills-lock.yaml
- **优先级**: P0
- **Lock 文件结构**:
  ```yaml
  version: 1
  skills:
    pr-review:
      source: github:vercel-labs/skills-tree
      sourceType: github
      sourceUrl: https://github.com/vercel-labs/skills-tree
      skillPath: review/pr-review
      skillFolderHash: abc123
      installedAt: "2026-03-01T10:00:00Z"
      updatedAt: "2026-03-01T10:00:00Z"
      agents:
        - claude-code
        - cursor
  ```
- **验收标准**:
  - 安装/更新/删除时自动维护
  - 支持导入/导出
  - 支持版本迁移

#### FR-010: 配置管理
- **描述**: 管理应用配置
- **优先级**: P1
- **配置内容**:
  - 默认安装模式（symlink/copy）
  - 自动检查更新间隔
  - 索引缓存 TTL
  - 代理设置（用于 GitHub API）
  - 主题设置

#### FR-011: 导入/导出
- **描述**: 导出和导入 skills 配置
- **优先级**: P2
- **支持格式**:
  - skills-lock.yaml（完整配置）
  - 纯 URL 列表（简易分享）
- **验收标准**:
  - 导出包含所有元数据
  - 导入时自动安装缺失 skills
  - 支持跨平台迁移

### 2.4 系统功能

#### FR-012: 日志查看
- **描述**: 查看操作日志
- **优先级**: P2
- **验收标准**:
  - 记录所有操作（安装/更新/删除）
  - 支持按级别筛选（info/warn/error）
  - 支持导出日志
  - 支持清空日志

#### FR-013: 备份与恢复
- **描述**: 备份 skills 配置
- **优先级**: P2
- **验收标准**:
  - 一键导出所有配置和 lock 文件
  - 从备份恢复
  - 定期自动备份（可选）

---

## 3. 非功能需求

### 3.1 性能

| 指标 | 要求 |
|------|------|
| 启动时间 | < 2 秒 |
| 列表加载 | < 300ms |
| 搜索响应 | < 100ms |
| 安装速度 | 与 git clone 相当 |
| 内存占用 | < 150MB |

### 3.2 兼容性

| 平台 | 支持 |
|------|------|
| macOS | Intel + Apple Silicon (10.15+) |
| Windows | Windows 10/11 |
| Linux | Ubuntu 20.04+, Debian, Fedora |

### 3.3 可靠性
- 操作失败时显示清晰的错误信息
- 支持操作撤销（如删除前的确认）
- 自动备份配置文件
- 安装失败时自动清理
- 支持断点续传（大仓库）

### 3.4 安全性
- 所有操作本地执行，不上传数据
- 安装 skill 前显示来源信息
- 支持 Git 签名验证（可选）
- 沙箱模式运行不可信 skills（未来）

### 3.5 可维护性
- 代码模块化，易于扩展
- 完善的错误处理
- 详细的日志记录
- 文档完整

---

## 4. 用户界面

### 4.1 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar                    Main Content                    │
│  ┌─────────┐  ┌──────────────────────────────────────────┐ │
│  │ Dashboard │  │                                         │ │
│  │ Installed│  │    [Page Content]                       │ │
│  │ Discover │  │                                         │ │
│  │ Agents   │  │                                         │ │
│  │ Settings │  │                                         │ │
│  └─────────┘  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 页面定义

| 页面 | 路径 | 描述 |
|------|------|------|
| Dashboard | `/` | 统计概览、快捷操作、最近活动 |
| Installed Skills | `/installed` | 已安装 skills 列表 |
| Skill Detail | `/installed/:id` | Skill 详情 |
| Discover | `/discover` | 在线发现新 skills |
| Agents | `/agents` | Agent 管理 |
| Settings | `/settings` | 应用设置 |

### 4.3 关键交互

#### 安装 Skill
1. 点击"Install"按钮或从 Discover 页面选择
2. 输入 GitHub URL 或选择本地目录
3. （可选）选择子 skill（支持 `@` 语法）
4. 选择目标 Agents
5. 选择安装模式（symlink/copy）
6. 确认安装
7. 显示克隆/复制进度
8. 验证 SKILL.md 格式
9. 更新 lock 文件
10. 刷新列表

#### 发现 Skills
1. 进入 Discover 页面
2. 输入关键词搜索
3. 或浏览分类/热门
4. 点击 skill 查看详情
5. 预览 SKILL.md
6. 点击 Install 直接安装

---

## 5. Skill 格式规范

### 5.1 SKILL.md 结构

```markdown
---
name: "skill-name"
description: "What this skill does"
author: "author-name"
tags: ["tag1", "tag2"]
version: "1.0.0"
---

# Skill Name

## Description

Detailed description...

## Installation

```bash
npx skills add github:user/repo
```

## Usage

How to use this skill...

## Files

- `rule.md` - System prompt rules
- `templates/` - Code templates
```

### 5.2 目录结构

```
skill-folder/
├── SKILL.md          # 元数据和文档
├── rule.md           # 系统提示规则（可选）
├── templates/        # 代码模板（可选）
├── examples/         # 示例（可选）
└── assets/           # 资源文件（可选）
```

---

## 6. 术语表

| 术语 | 定义 |
|------|------|
| Skill | AI Agent 的技能包，包含 SKILL.md 和相关资源 |
| Agent | AI 编程助手（Claude Code, Cursor 等）|
| Source | Skill 的来源（GitHub URL、本地路径等）|
| Lock File | skills-lock.yaml，记录已安装 skills 的元数据 |
| Symlink | 符号链接安装模式（推荐，节省空间）|
| Copy | 复制安装模式（完全隔离）|
| Universal | 通用 Agent 配置（.agents/skills）|

---

## 7. 附录

### 7.1 参考
- [Vercel Skills CLI](https://github.com/vercel-labs/skills) - 概念参考
- [Tauri 文档](https://tauri.app/)

### 7.2 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| 0.1.0 | 2026-03-01 | 初始版本（依赖 CLI）| - |
| 0.2.0 | 2026-03-01 | 改为完全自研架构 | - |
