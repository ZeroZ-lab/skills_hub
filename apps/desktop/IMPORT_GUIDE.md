# 从系统导入到 Skills Manager 指南

## 概述

Skills Manager 支持从已安装的 AI Agent 导入配置，包括：
- **MCP 服务器配置** - 从 Claude Code、Cursor 等 agent 导入 MCP 服务器
- **Skills 扫描** - 自动检测系统中已安装的 skills

---

## 1. 导入 MCP 服务器配置

### 步骤

1. **打开 MCP Manager 页面**
   - 点击侧边栏的 "MCP" 菜单

2. **点击导入按钮**
   - 在页面右上角找到 "Import" 按钮
   - 点击打开导入对话框

3. **选择 Agent**
   - 对话框会显示所有已安装的 agents
   - 选择你想从中导入 MCP 配置的 agent
   - 支持的 agents：
     - Claude Code
     - Cursor
     - Windsurf
     - Codex
     - 等其他已安装的 agents

4. **执行导入**
   - 点击 "Import" 按钮
   - 系统会读取该 agent 的 MCP 配置文件
   - 自动解析并导入所有 MCP 服务器

5. **查看导入结果**
   - 导入完成后会显示导入的服务器列表
   - 每个服务器会显示名称、类型和配置信息
   - 点击 "Done" 完成导入

### 导入的内容

从 agent 配置文件中导入：
- **服务器名称** - MCP 服务器的标识名
- **服务器类型** - stdio、sse、http 等
- **配置信息** - 命令、参数、环境变量等
- **连接信息** - URL、端口等（如适用）

### 配置文件位置

不同 agent 的 MCP 配置文件位置：

| Agent | 配置文件路径 |
|-------|------------|
| Claude Code | `~/.claude/claude_desktop_config.json` |
| Cursor | `~/Library/Application Support/Cursor/User/globalStorage/mcp.json` |
| Windsurf | `~/.windsurf/mcp_config.json` |
| Codex | `~/.codex/mcp-servers.toml` |

---

## 2. Skills 自动检测

### 当前实现

Skills Manager 会自动扫描系统中的 skills：

1. **全局 Skills 目录**
   - `~/.agents/skills/` - 全局安装的 skills
   - 所有 agents 共享

2. **Agent 特定目录**
   - 每个 agent 可能有自己的 skills 目录
   - 例如：`~/.claude/skills/`、`~/.cursor/skills/`

3. **Lock 文件**
   - `~/.agents/.skill-lock.json` - 全局 lock 文件
   - 记录所有已安装的 skills 及其版本

### 查看已安装的 Skills

1. **打开 Installed 页面**
   - 点击侧边栏的 "Installed" 菜单

2. **查看 Skills 列表**
   - 显示所有已安装的 skills
   - 可以按 agent 筛选
   - 可以按作用域（global/project）筛选

3. **Skills 信息**
   - 名称和描述
   - 安装的 agents
   - 来源（GitHub、本地等）
   - 版本信息

---

## 3. 从其他来源导入

### 从 GitHub 安装 Skills

1. **打开 Discover 页面**
   - 搜索想要的 skill
   - 点击 "Install" 按钮

2. **或在 Installed 页面**
   - 点击 "Install Skill" 按钮
   - 输入 GitHub 源地址，例如：
     - `vercel/skills@find-skills`
     - `https://github.com/vercel/skills`
     - `vercel-labs/agent-skills`

3. **选择安装选项**
   - 选择要安装到哪些 agents
   - 选择安装模式（symlink/copy）
   - 选择作用域（global/project）

### 从本地目录安装

1. **在 Install Modal 中**
   - 输入本地路径，例如：
     - `/Users/username/my-skills/custom-skill`
     - `~/projects/my-skill`

2. **系统会**
   - 验证目录是否包含有效的 SKILL.md
   - 创建符号链接或复制到目标位置
   - 更新 lock 文件

---

## 4. 配置同步

### MCP 配置同步

导入 MCP 服务器后：

1. **自动同步**
   - Skills Manager 会将配置写回到各个 agent 的配置文件
   - 保持配置一致性

2. **Per-Agent 控制**
   - 可以为每个 agent 单独启用/禁用 MCP 服务器
   - 在 MCP 详情页面切换开关

3. **同步状态**
   - 每个 agent 显示同步状态：
     - ✅ Synced - 已同步
     - ⏳ Pending - 等待同步
     - ❌ Error - 同步失败

### Skills 同步

Skills 安装后：

1. **自动安装到选定的 Agents**
   - 根据安装选项自动部署
   - 更新各 agent 的 skills 目录

2. **Lock 文件更新**
   - 全局 lock 文件记录安装信息
   - 包含版本、来源、哈希值等

---

## 5. 故障排除

### MCP 导入失败

**问题**: 导入时提示找不到配置文件

**解决方案**:
1. 确认 agent 已正确安装
2. 检查配置文件是否存在
3. 确认文件权限正确

**问题**: 导入的服务器无法连接

**解决方案**:
1. 检查服务器配置是否正确
2. 验证命令路径是否有效
3. 检查环境变量是否设置

### Skills 检测问题

**问题**: 已安装的 skill 未显示

**解决方案**:
1. 检查 skill 目录是否正确
2. 验证 SKILL.md 文件是否存在
3. 检查 lock 文件是否损坏
4. 点击 "Check Updates" 刷新列表

---

## 6. 最佳实践

### 导入建议

1. **先导入 MCP 配置**
   - 从主要使用的 agent 导入
   - 避免重复导入相同的服务器

2. **定期检查更新**
   - 使用 "Check Updates" 功能
   - 保持 skills 为最新版本

3. **备份配置**
   - 使用 Settings 页面的导出功能
   - 定期备份重要配置

### 多 Agent 管理

1. **统一管理**
   - 在 Skills Manager 中统一管理所有 MCP 服务器
   - 避免直接修改 agent 配置文件

2. **选择性启用**
   - 不是所有 agent 都需要所有 MCP 服务器
   - 根据需要为每个 agent 启用相应的服务器

3. **监控同步状态**
   - 定期检查同步状态
   - 及时处理同步错误

---

## 7. 命令行工具（未来支持）

计划支持命令行导入：

```bash
# 导入 MCP 配置
skills-manager import mcp --from claude-code

# 扫描并导入 skills
skills-manager import skills --scan

# 从配置文件导入
skills-manager import --config ./backup.json
```

---

## 需要帮助？

- 查看应用内的帮助文档
- 检查日志文件：`~/.skills-manager/logs/`
- 提交 Issue 到 GitHub 仓库
