# UI/UX 设计规范

**文档编号**: SM-DES-001
**版本**: 0.3.0
**状态**: 草案
**最后更新**: 2026-03-01

---

## 1. 设计原则

### 1.1 视觉风格

- **主题**: 深色主题（Dark Mode）为默认，支持浅色主题切换
- **主背景**: `#0f0f1a`
- **卡片背景**: `#1e1e2e`
- **强调色**: Indigo (`#6366f1`) + Purple (`#8b5cf6`)
- **字体**: Inter（Google Fonts）
- **圆角**: 统一使用 `rounded-xl`（12px）和 `rounded-lg`（8px）

### 1.2 交互原则

- **悬停效果**: 轻微上浮（translateY -2px）+ 阴影增强
- **状态切换**: 平滑过渡动画（150–300ms）
- **反馈明确**: 所有操作按钮均有视觉响应
- **一致性**: 相同操作在所有页面使用相同交互模式

---

## 2. 颜色系统

### 2.1 背景色

```css
--bg-primary:   #0f0f1a;                  /* 主背景 */
--bg-secondary: #1e1e2e;                  /* 卡片背景 */
--bg-tertiary:  #2d2d44;                  /* 悬浮层 */
--bg-hover:     rgba(255, 255, 255, 0.05);
```

### 2.2 边框

```css
--border-default: #2d2d44;
--border-hover:   #6366f1;
```

### 2.3 文字

```css
--text-primary:   #ffffff;
--text-secondary: #9ca3af;
--text-muted:     #6b7280;
```

### 2.4 强调色

```css
--accent-indigo: #6366f1;
--accent-purple: #8b5cf6;
--accent-blue:   #3b82f6;
--accent-green:  #10b981;
--accent-amber:  #f59e0b;
--accent-red:    #ef4444;
```

---

## 3. 布局框架

### 3.1 总体布局

```
┌─────────────────────────────────────────────────────────────┐
│  侧边栏 (256px)            主内容区                           │
│  ┌─────────┐  ┌──────────────────────────────────────────┐  │
│  │ Logo    │  │  Header（固定置顶）                        │  │
│  │ ──────  │  ├──────────────────────────────────────────┤  │
│  │ 仪表盘  │  │                                          │  │
│  │ 已安装  │  │  内容区域（可滚动）                        │  │
│  │ 发现    │  │                                          │  │
│  │ MCP     │  │                                          │  │
│  │ Agents  │  │                                          │  │
│  │ 设置    │  │                                          │  │
│  │ ──────  │  │                                          │  │
│  │ 状态栏  │  │                                          │  │
│  └─────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 导航结构

| 导航项 | 路径 | 图标 | 徽章 | 说明 |
|--------|------|------|------|------|
| 仪表盘 | `/` | `Home` | - | 首页概览 |
| 已安装 Skills | `/installed` | `Package` | 数量 | 管理已安装 |
| 发现 | `/discover` | `Compass` | New | 搜索和发现 |
| MCP 管理 | `/mcp` | `Server` | 数量 | MCP Server 配置 |
| Agents | `/agents` | `Bot` | 数量 | Agent 管理 |
| 设置 | `/settings` | `Settings` | - | 应用设置 |

---

## 4. 组件规范

### 4.1 统计卡片（Stat Card）

```
┌──────────────────────────┐
│ [图标]          [徽章]   │
│                           │
│   42                      │
│   已安装 Skills            │
└──────────────────────────┘
```

**颜色映射**:

| 统计项 | 主色 |
|--------|------|
| Skills 总数 | blue |
| 已连接 Agents | purple |
| MCP Servers | indigo |
| 待更新 | amber |
| 安全状态 | green |

**CSS 样式**:
```css
.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 24px;
  transition: all 200ms ease-out;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.3);
}
```

### 4.2 Skill 列表项

```
┌────────────────────────────────────────────────────────┐
│  [渐变图标]  skill-name   v1.2.3  [有更新]             │
│              描述文字（单行截断）                         │
│              [claude-code] [cursor]      [↑] [👁] [🗑] │
└────────────────────────────────────────────────────────┘
```

**交互**:
- 悬停：左侧显示 2px indigo 边框
- 操作按钮：8px 圆角，32×32px 点击区域
- 删除按钮悬停时变为红色

### 4.3 发现页 Skill 卡片

```
┌────────────────────────────────────────────────────────┐
│  [图标]  skill-name                   [⭐ 4.8]  [安装] │
│          描述文字（最多两行）                             │
│          👤 author    🔒 Safe    📥 2.1k downloads      │
└────────────────────────────────────────────────────────┘
```

### 4.4 MCP Server 卡片

```
┌────────────────────────────────────────────────────────┐
│  [●/○]  server-name            [stdio]                 │
│         command: npx -y @mcp/server-fs                 │
│         [claude ✓] [cursor !] [codex ○]    [✏] [🗑]   │
└────────────────────────────────────────────────────────┘
```

**状态指示**:
- 绿色圆点：至少一个 Agent 已启用且最近同步成功
- 灰色圆点：所有 Agent 均禁用
- 琥珀色圆点：存在待同步或部分同步失败
- 红色圆点：运行时连接错误

**Per-App Toggle**:
- 每个 Agent 标签旁显示独立的 ✓/○ 开关
- 点击 Agent 标签直接切换该 Agent 的启用/禁用
- 禁用的 Agent 标签变为灰色半透明
- `!` 表示该 Agent 的 MCP 同步失败；悬停时展示 `lastError`
- 同步中的 Agent 标签显示 loading 态或琥珀色边框

### 4.5 Agent 标签颜色

| Agent | 颜色 |
|-------|------|
| Claude Code | purple |
| Cursor | blue |
| OpenClaw | green |
| GitHub Copilot | gray |
| Codex | cyan |
| Gemini CLI | red |
| Windsurf | teal |
| Cline | orange |
| Continue | pink |
| Universal | indigo |

---

## 5. 页面详情

### 5.1 仪表盘（Dashboard）

```
┌─────────────────────────────────────────────────────────┐
│ 仪表盘 / 管理和发现你的 AI Agent Skills                   │
├─────────────────────────────────────────────────────────┤
│ [统计卡片 ×5: Skills · Agents · MCP · 更新 · 安全]      │
├──────────────────────────────┬──────────────────────────┤
│ 快捷操作（×5）                │ 最近活动                  │
├─────────────────────────────────────────────────────────┤
│ 已安装 Skills 列表（前 5 条）                             │
├─────────────────────────────────────────────────────────┤
│ Agent 状态卡片                                           │
└─────────────────────────────────────────────────────────┘
```

**快捷操作**:

| 按钮 | 颜色 | 动作 |
|------|------|------|
| 搜索 Skills | Indigo | 跳转到发现页 |
| 本地安装 | Purple | 打开文件选择器 |
| 添加 MCP | Blue | 打开 MCP 添加 Modal |
| 检查更新 | Amber | 触发更新检查 |
| 导出配置 | Green | 导出 Skills + MCP 配置 |

### 5.2 MCP 管理页

```
┌─────────────────────────────────────────────────────────┐
│ MCP Servers                          [+ 添加] [导入]    │
├─────────────────────────────────────────────────────────┤
│ [🔍 搜索框]              [全部] [stdio] [sse] [http]    │
├─────────────────────────────────────────────────────────┤
│ [MCP Server 卡片列表...]                                 │
│                                                          │
│ ┌──────────────────────────────────────────────────┐    │
│ │ ● filesystem-server           [stdio]            │    │
│ │   npx -y @modelcontextprotocol/server-filesystem │    │
│ │   [claude ✓] [cursor !] [codex ○]    [✏] [🗑]   │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ ┌──────────────────────────────────────────────────┐    │
│ │ ● github-server               [stdio]            │    │
│ │   npx -y @modelcontextprotocol/server-github     │    │
│ │   [claude ✓] [cursor ○] [gemini …]   [✏] [🗑]   │    │
│ └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**错误与同步反馈**:
- 卡片右上角提供“查看同步详情”入口，展开后显示每个 Agent 的 `syncStatus`、最近同步时间和错误信息
- 当 `mcp-sync-status` 事件到达时，卡片内对应 Agent 标签即时刷新，无需整页重载

### 5.3 MCP 添加/编辑 Modal

```
┌─────────────────────────────────────────────────────────┐
│ 添加 MCP Server                                 [×]    │
├─────────────────────────────────────────────────────────┤
│ 名称: [________________]                                │
│                                                          │
│ 类型: (● stdio) (○ sse) (○ http)                        │
│                                                          │
│ ─── stdio 配置 ───                                       │
│ 命令:  [npx________________]                             │
│ 参数:  [-y, @mcp/server-fs__]                            │
│ 环境变量:                                                │
│   [API_KEY] = [••••••••••••••••]         [+ 添加]       │
│   本机保存并同步到已选 Agent；导出时默认脱敏              │
│                                                          │
│ ─── 目标 Agent ───                                       │
│ [✓ Claude Code] [✓ Cursor] [□ Codex] [□ Gemini]        │
│                                                          │
│ ─── 预览 ───                                             │
│ ┌────────────────────────────────────────────────┐      │
│ │ { "mcpServers": { "fs": { "command": "npx",    │      │
│ │   "env": { "API_KEY": "***redacted***" } } } } │      │
│ └────────────────────────────────────────────────┘      │
│                                                          │
│                              [取消]  [JSON 编辑]  [保存] │
└─────────────────────────────────────────────────────────┘
```

- `env` / `headers` 等敏感字段允许保存在当前电脑并同步到本机 Agent 配置
- 预览、导出、分享、备份默认显示脱敏值；用户需显式确认才可导出原始值

### 5.4 发现页（Discover）

```
┌─────────────────────────────────────────────────────────┐
│ 发现 Skills                                             │
├─────────────────────────────────────────────────────────┤
│ [🔍 搜索框]                   [筛选 ▼]  [排序 ▼]        │
├─────────────────────────────────────────────────────────┤
│ [热门]  [最新]  [官方精选]  [我的 Agent 适用]            │
├─────────────────────────────────────────────────────────┤
│ [Skill 卡片列表...]                                      │
└─────────────────────────────────────────────────────────┘
```

**数据来源选项卡**:
- 官方精选（skills.sh）
- GitHub 搜索
- Well-Known 协议
- 本地缓存

### 5.5 安装 Modal

**表单字段**:

1. **来源输入**
   - Placeholder: `GitHub URL、本地路径、或 owner/repo 简写...`
   - 提示: `支持: user/repo · user/repo@skill · https://github.com/... · ./本地路径 · ZIP 文件拖拽`
   - 支持 ZIP 文件拖拽上传

2. **可选 Skill**（当来源含多个 Skill 时）
   - 多选列表，显示每个 Skill 的名称和描述

3. **安装目标**（多选）
   - 自动显示已检测到的 Agents（含安装状态）
   - 支持全选

4. **默认安装作用域**（单选）
   - ● 全局（安装到全局目录）
   - ○ 项目级（安装到当前项目）

5. **默认安装模式**（单选）
   - ● Symlink（推荐，节省空间，实时同步）
   - ○ Copy（完全隔离，独立副本）

6. **按 Agent 覆盖**（可折叠高级区）
   - 仅当用户选择多个 Agent 时显示
   - 每行一个 Agent：`Claude Code | scope: [默认▼] | mode: [默认▼]`
   - 可将单个 Agent 覆盖为不同的 `scope` / `mode`
   - 未修改时沿用默认安装配置

### 5.6 深度链接落地页

当通过 `skillsmanager://install?source=...` 激活时显示：

```
┌─────────────────────────────────────────────────────────┐
│ 导入 Skill                                       [×]   │
├─────────────────────────────────────────────────────────┤
│ 来源: github:vercel-labs/skills-tree@pr-review          │
│                                                          │
│ ┌──────────────────────────────────────────────────┐    │
│ │ pr-review                                        │    │
│ │ AI-powered pull request code review              │    │
│ │ ⭐ 1.2k  👤 vercel-labs  🔒 Safe                │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ 安装到:                                                  │
│ [✓ Claude Code] [✓ Cursor] [□ Codex]                    │
│                                                          │
│                              [取消]          [确认安装]  │
└─────────────────────────────────────────────────────────┘
```

---

## 6. 图标使用

使用 **Lucide React**：

| 用途 | Lucide 图标 |
|------|------------|
| 仪表盘 | `Home` |
| Skills | `Package` |
| 发现 | `Compass` |
| MCP | `Server` |
| Agents | `Bot` |
| 设置 | `Settings` |
| 安装 | `Plus` |
| 更新 | `ArrowUp` |
| 删除 | `Trash2` |
| 查看 | `Eye` |
| 搜索 | `Search` |
| GitHub | `Github` |
| 导出 | `FileOutput` |
| 导入 | `FileInput` |
| 链接 | `Link` |
| 安全 | `Shield` |
| 同步 | `RefreshCw` |
| 启用 | `ToggleRight` |
| 禁用 | `ToggleLeft` |

---

## 7. 动画规范

| 动画 | 时长 | 缓动 |
|------|------|------|
| 卡片悬停上浮 | 200ms | ease-out |
| 颜色过渡 | 150ms | ease |
| Modal 弹出 | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 列表条目进入 | 400ms | ease-out |
| Toggle 切换 | 200ms | ease-in-out |
| 进度条 | 300ms | linear |

```css
/* 侧边栏激活项 */
.sidebar-item.active {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  border-right: 3px solid #818cf8;
}

/* Skill 卡片悬停 */
.skill-card:hover {
  border-left-color: #6366f1;
}

/* MCP Server 状态指示 */
.mcp-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}
.mcp-status-dot.connected { background: #10b981; }
.mcp-status-dot.disconnected { background: #6b7280; }
.mcp-status-dot.error { background: #ef4444; }
```

---

## 8. 响应式断点

| 断点 | 宽度 | 布局调整 |
|------|------|---------|
| Mobile | < 640px | 侧边栏隐藏，底部导航栏 |
| Tablet | 640–1024px | 侧边栏折叠为图标模式 |
| Desktop | > 1024px | 完整两栏布局 |

---

## 9. 组件拆分

```
src/components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Layout.tsx
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Badge.tsx
│   ├── Tag.tsx
│   ├── Toggle.tsx
│   └── StatusDot.tsx
├── skills/
│   ├── SkillCard.tsx
│   ├── SkillList.tsx
│   ├── SkillDetail.tsx
│   └── InstallModal.tsx
├── mcp/
│   ├── MCPServerCard.tsx
│   ├── MCPServerList.tsx
│   ├── MCPServerForm.tsx
│   ├── MCPAgentToggle.tsx
│   └── MCPConfigPreview.tsx
├── stats/
│   └── StatCard.tsx
├── agents/
│   ├── AgentCard.tsx
│   └── AgentSelector.tsx
├── discover/
│   ├── SearchBar.tsx
│   ├── FilterTabs.tsx
│   └── SkillDiscoveryCard.tsx
└── deeplink/
    └── DeepLinkLanding.tsx
```

---

## 10. Demo 原型

见 `../skills-manager-demo.html`，包含完整的 Dashboard 布局静态原型：统计卡片、快捷操作、最近活动、Skills 列表、Agent 状态、安装 Modal。

---

*相关文档: [PRD](../01-requirements/PRD.md) · [系统设计](../02-architecture/SYSTEM-DESIGN.md) · [Tauri Commands](../04-api/TAURI-COMMANDS.md)*
