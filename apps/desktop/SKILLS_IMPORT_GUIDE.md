# Skills 导入功能使用指南

## 功能概述

Skills Manager 现在支持从系统中已安装的 agent 目录扫描并导入 skills。

---

## 使用方法

### 1. 打开导入对话框

1. 进入 **Installed Skills** 页面
2. 点击右上角的 **"Import"** 按钮
3. 导入对话框会打开

### 2. 选择导入方式

有两种导入方式：

#### 方式一：扫描所有目录（推荐）

- 选择 "扫描所有目录" 选项
- 系统会自动扫描以下常见目录：
  - `~/.agents/skills/`
  - `~/.claude/skills/`
  - `~/.cursor/skills/`
  - `~/.windsurf/skills/`

#### 方式二：从特定 Agent 导入

- 选择一个已安装的 agent
- 系统只扫描该 agent 的 skills 目录
- 支持的 agents：
  - Claude Code
  - Cursor
  - Windsurf
  - Codex
  - 等其他已安装的 agents

### 3. 开始扫描

1. 选择导入方式后，点击 **"开始扫描"** 按钮
2. 系统会显示扫描进度
3. 扫描完成后显示结果

### 4. 查看扫描结果

扫描完成后会显示：

- **发现的 skills**: 在目录中找到的 skill 总数
- **已导入**: 成功导入到 lock 文件的 skill 数量
- **跳过**: 因各种原因跳过的 skill 数量
- **警告和错误**: 详细的错误信息列表

### 5. 完成导入

点击 **"完成"** 按钮关闭对话框，导入的 skills 会自动显示在列表中。

---

## 导入规则

### 什么会被导入？

系统会扫描目录中的所有子目录，并检查：

1. **目录结构**: 必须是一个目录（不是文件）
2. **SKILL.md 文件**: 目录中必须包含 `SKILL.md` 文件
3. **不重复**: 如果 skill 已经在 lock 文件中，会跳过

### 什么会被跳过？

以下情况会跳过导入：

1. **没有 SKILL.md**: 目录中找不到 `SKILL.md` 文件
2. **已存在**: Skill 已经在 lock 文件中
3. **无效目录**: 不是有效的目录结构

---

## 扫描的目录

### 全局目录

- `~/.agents/skills/` - 全局 skills 目录（所有 agents 共享）

### Agent 特定目录

| Agent | Skills 目录 |
|-------|------------|
| Claude Code | `~/.claude/skills/` |
| Cursor | `~/.cursor/skills/` |
| Windsurf | `~/.windsurf/skills/` |
| Codex | `~/.codex/skills/` |

---

## 示例场景

### 场景 1: 首次使用 Skills Manager

如果你之前手动安装了一些 skills 到各个 agent 目录：

1. 打开 Skills Manager
2. 点击 "Import" 按钮
3. 选择 "扫描所有目录"
4. 点击 "开始扫描"
5. 系统会找到所有已安装的 skills 并导入

### 场景 2: 从特定 Agent 导入

如果你只想导入某个 agent 的 skills：

1. 打开 "Import" 对话框
2. 选择特定的 agent（如 "Claude Code"）
3. 点击 "开始扫描"
4. 只有该 agent 目录中的 skills 会被扫描

### 场景 3: 定期同步

如果你在 agent 目录中手动添加了新的 skills：

1. 随时打开 "Import" 对话框
2. 重新扫描
3. 新的 skills 会被自动检测并导入

---

## 注意事项

### 当前限制

1. **只读扫描**: 导入功能只读取现有的 skills，不会修改它们
2. **基础元数据**: 当前版本只导入基本信息，完整的元数据解析将在后续版本中实现
3. **手动安装**: 导入的 skills 需要已经存在于文件系统中

### 未来改进

计划中的功能：

1. **完整元数据解析**: 从 SKILL.md 中提取所有信息
2. **源检测**: 自动检测 skill 的来源（GitHub、本地等）
3. **版本管理**: 检测和管理 skill 版本
4. **自动更新**: 检测可用更新

---

## 故障排除

### 问题: 扫描没有找到任何 skills

**可能原因**:
- Skills 目录不存在
- 目录中没有有效的 skills（缺少 SKILL.md）
- Skills 已经在 lock 文件中

**解决方案**:
1. 检查 skills 目录是否存在
2. 确认每个 skill 目录都包含 `SKILL.md` 文件
3. 查看扫描结果中的错误信息

### 问题: 某些 skills 被跳过

**可能原因**:
- Skill 已经在 lock 文件中
- 缺少 SKILL.md 文件
- 目录结构不正确

**解决方案**:
- 查看 "警告和错误" 列表了解具体原因
- 检查被跳过的 skill 目录结构

### 问题: 导入失败

**可能原因**:
- 没有读取权限
- Agent 目录不存在
- 系统错误

**解决方案**:
1. 检查文件权限
2. 确认 agent 已正确安装
3. 查看错误信息

---

## 与 MCP 导入的区别

| 特性 | Skills 导入 | MCP 导入 |
|------|------------|----------|
| 数据源 | 文件系统目录 | Agent 配置文件 |
| 导入内容 | Skill 目录 | MCP 服务器配置 |
| 修改原文件 | 否 | 否 |
| 同步回写 | 否 | 是（MCP 会同步） |

---

## 命令行支持（计划中）

未来将支持命令行导入：

```bash
# 扫描所有目录
skills-manager import skills --scan-all

# 从特定 agent 导入
skills-manager import skills --from claude-code

# 指定目录
skills-manager import skills --dir ~/.custom/skills
```

---

## 相关功能

- **Install Skill**: 从 GitHub 或本地安装新的 skill
- **Check Updates**: 检查已安装 skills 的更新
- **MCP Import**: 从 agent 配置导入 MCP 服务器

---

需要帮助？查看主导入指南 `IMPORT_GUIDE.md` 或提交 Issue。
