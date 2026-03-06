# Agent 注册表规范 (Agent Registry Spec)

**文档编号**: SM-ARCH-002
**版本**: 0.3.0

---

## 1. 概述

Agent Registry 是 Skills Manager 的核心配置驱动文件（`agents.yaml`）。它定义了 42+ 个 AI Agent 的识别方式、Skills 存放路径以及 MCP 配置格式。

## 2. Schema 定义 (YAML)

```yaml
# 示例：Claude Code
- id: "claude-code"
  displayName: "Claude Code"
  category: "non-universal"
  platforms:
    macos:
      skillsDir: ".claude/skills"
      globalDir: "~/.claude/skills"
      detectPath: "~/.claude"
    windows:
      skillsDir: ".claude/skills"
      globalDir: "%USERPROFILE%/.claude/skills"
    linux:
      skillsDir: ".claude/skills"
      globalDir: "~/.claude/skills"
  mcp:
    format: "json"
    configPath: "~/.claude.json"
    configKey: "mcpServers"

# 示例：Cursor (Universal 类型)
- id: "cursor"
  displayName: "Cursor"
  category: "universal"
  platforms:
    all:
      skillsDir: ".agents/skills"
      globalDir: "~/.cursor/skills"
      detectCommand: "cursor"
  mcp:
    format: "json"
    configPath: "~/.cursor/mcp.json"
```

## 3. 核心字段说明

| 字段 | 说明 |
|------|------|
| `category` | `universal` (符合 .agents/ 规范) 或 `non-universal` (自有目录) |
| `skillsDir` | 项目级安装时的相对路径（如 `.claude/skills`、`.agents/skills`） |
| `globalDir` | 全局安装时的绝对路径 |
| `detectCommand` | 用于检测 Agent 是否安装的可执行文件名；运行时会通过 `which <detectCommand>` 检查 |
| `configKey` | 在 JSON/TOML 中存放 MCP 列表的根键名 |

## 4. 已集成列表 (部分)

目前已完成以下 Agent 的路径映射：
1. **Claude Code**: `~/.claude/skills`
2. **Cursor**: `~/.cursor/skills`
3. **GitHub Copilot**: `~/.copilot/skills`
4. **Codex**: `~/.codex/skills`
5. **Gemini CLI**: `~/.gemini/skills`
6. **Cline**: `~/.agents/skills`
7. **OpenClaw**: `skills/`
8. **Windsurf**: `~/.windsurf/skills`
... (共 42+ 项)
