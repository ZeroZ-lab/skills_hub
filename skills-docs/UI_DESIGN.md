# Skills Manager - UI/UX 设计规范
> ⚠️ **已归档** — 此文件为 v0.1.0 草案，已被 [03-design/UI-DESIGN-SPEC.md](./03-design/UI-DESIGN-SPEC.md) 取代，请勿参考。


**版本**: 0.1.0  
**日期**: 2026-03-01  

---

## 1. 设计原则

### 1.1 视觉风格
- **深色主题**: 主背景 `#0f0f1a`，卡片背景 `#1e1e2e`
- **强调色**: Indigo (`#6366f1`) + Purple (`#8b5cf6`)
- **字体**: Inter (Google Fonts)
- **圆角**: 统一使用 `rounded-xl` (12px) 和 `rounded-lg` (8px)

### 1.2 交互原则
- 悬停效果: 轻微上浮 + 阴影增强
- 状态变化: 平滑过渡动画 (200-300ms)
- 反馈明确: 操作按钮有视觉响应

---

## 2. 页面结构

### 2.1 布局框架

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (256px)              Main Content                  │
│  ┌─────────┐  ┌──────────────────────────────────────────┐ │
│  │ Logo    │  │  Header (sticky)                         │ │
│  │ Nav     │  ├──────────────────────────────────────────┤ │
│  │         │  │                                          │ │
│  │ Dashboard│  │  Content Area                            │ │
│  │ Skills  │  │  - Stats Cards                           │ │
│  │ Discover│  │  - Quick Actions                         │ │
│  │ Agents  │  │  - Lists                                 │ │
│  │ Settings│  │                                          │ │
│  │         │  │                                          │ │
│  │ Status  │  │                                          │ │
│  └─────────┘  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 导航结构

| 导航项 | 路径 | 徽章 | 说明 |
|--------|------|------|------|
| Dashboard | `/` | - | 首页概览 |
| 已安装 Skills | `/installed` | 数量 | 管理已安装 |
| 发现 | `/discover` | New | 搜索和发现 |
| Agents | `/agents` | 数量 | Agent 管理 |
| 设置 | `/settings` | - | 应用设置 |

---

## 3. 组件规范

### 3.1 颜色系统

```css
/* 背景色 */
--bg-primary: #0f0f1a;      /* 主背景 */
--bg-secondary: #1e1e2e;    /* 卡片背景 */
--bg-tertiary: #2d2d44;     /* 悬浮层 */
--bg-hover: rgba(255,255,255,0.05);

/* 边框 */
--border-default: #2d2d44;
--border-hover: #6366f1;

/* 文字 */
--text-primary: #ffffff;
--text-secondary: #9ca3af;
--text-muted: #6b7280;

/* 强调色 */
--accent-indigo: #6366f1;
--accent-purple: #8b5cf6;
--accent-blue: #3b82f6;
--accent-green: #10b981;
--accent-amber: #f59e0b;
--accent-red: #ef4444;
```

### 3.2 组件样式

#### 统计卡片 (Stat Card)

```html
<div class="bg-dark-800 border border-dark-700 rounded-xl p-6 card-hover transition-all">
  <div class="flex items-center justify-between mb-4">
    <!-- 图标 -->
    <div class="w-12 h-12 bg-{color}-500/10 rounded-xl flex items-center justify-center">
      <i class="fas fa-{icon} text-{color}-400 text-xl"></i>
    </div>
    <!-- 徽章 (可选) -->
    <span class="text-xs text-{color}-400 bg-{color}-500/10 px-2 py-1 rounded-full">{ badge }</span>
  </div>
  <!-- 数值 -->
  <div class="text-3xl font-bold text-white">{ value }</div>
  <!-- 标签 -->
  <div class="text-sm text-gray-500 mt-1">{ label }</div>
</div>
```

**颜色映射:**
- Skills 数量: `blue`
- Agents: `purple`
- 更新: `amber`
- 安全: `green`

#### Skill 列表项

```html
<div class="skill-card p-6 flex items-center gap-4 border-l-2 border-transparent hover:border-indigo-500">
  <!-- 图标 -->
  <div class="w-12 h-12 bg-gradient-to-br from-{from}-500 to-{to}-600 rounded-xl flex items-center justify-center flex-shrink-0">
    <i class="fas fa-{icon} text-white"></i>
  </div>
  
  <!-- 内容 -->
  <div class="flex-1 min-w-0">
    <!-- 标题行 -->
    <div class="flex items-center gap-3">
      <h4 class="text-white font-medium truncate">{ name }</h4>
      <span class="text-xs text-gray-500">{ version }</span>
      <span class="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">有更新</span>
    </div>
    <!-- 描述 -->
    <p class="text-sm text-gray-400 truncate mt-1">{ description }</p>
    <!-- Agent 标签 -->
    <div class="flex items-center gap-2 mt-2">
      <span class="agent-tag text-xs bg-{agent-color}-500/10 text-{agent-color}-400 px-2 py-0.5 rounded">{ agent }</span>
    </div>
  </div>
  
  <!-- 操作按钮 -->
  <div class="flex items-center gap-2">
    <button class="w-8 h-8 hover:bg-dark-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="更新">
      <i class="fas fa-arrow-up"></i>
    </button>
    <button class="w-8 h-8 hover:bg-dark-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="查看">
      <i class="fas fa-eye"></i>
    </button>
    <button class="w-8 h-8 hover:bg-red-500/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors" title="删除">
      <i class="fas fa-trash"></i>
    </button>
  </div>
</div>
```

#### Agent 标签颜色

| Agent | 颜色 |
|-------|------|
| Claude Code | purple |
| Cursor | blue |
| OpenClaw | green |
| GitHub Copilot | gray |
| Universal | indigo |

---

## 4. 页面详情

### 4.1 Dashboard 页面

**布局:**
```
┌─────────────────────────────────────────────────────────┐
│ Header: Dashboard / 管理和发现你的 AI Agent Skills       │
├─────────────────────────────────────────────────────────┤
│ [Stats Card x4]                                         │
├─────────────────────────────────────────────────────────┤
│ [Quick Actions x4]        │ [Recent Activity]           │
├─────────────────────────────────────────────────────────┤
│ [Installed Skills List]                                 │
├─────────────────────────────────────────────────────────┤
│ [Agents Status]                                         │
└─────────────────────────────────────────────────────────┘
```

**快捷操作按钮:**
1. 🔍 搜索 Skills (Indigo)
2. 📁 本地安装 (Purple)
3. 🔄 检查更新 (Amber)
4. 📤 导出配置 (Green)

### 4.2 Discover 页面 (发现)

**布局:**
```
┌─────────────────────────────────────────────────────────┐
│ Header: 发现 Skills                                     │
├─────────────────────────────────────────────────────────┤
│ [🔍 Search Input]              [Filter ▼] [Sort ▼]      │
├─────────────────────────────────────────────────────────┤
│ [热门] [最新] [官方精选] [我的 Agent 适用]              │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Icon] skill-name                     [⭐ 4.8] [安装]│ │
│ │ description...                                       │ │
│ │ 👤 author    🔒 Safe    📥 2.1k downloads           │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**来源选项卡:**
- 官方精选 (skills.sh)
- GitHub 搜索
- 本地缓存

### 4.3 Install Modal

**表单字段:**
1. **来源输入**
   - Placeholder: "GitHub URL 或本地路径..."
   - 提示: "支持: github:user/repo, 本地目录路径"

2. **安装目标** (多选)
   - Claude Code
   - Cursor
   - OpenClaw
   - ...

3. **安装模式** (单选)
   - ○ Symlink (推荐，节省空间)
   - ○ Copy (完全隔离)

---

## 5. 响应式断点

| 断点 | 宽度 | 布局调整 |
|------|------|----------|
| Mobile | < 640px | 侧边栏隐藏，底部导航 |
| Tablet | 640-1024px | 侧边栏折叠 |
| Desktop | > 1024px | 完整布局 |

---

## 6. 动画规范

### 6.1 过渡时间

| 动画 | 时间 | 缓动 |
|------|------|------|
| 悬停上浮 | 200ms | ease-out |
| 颜色变化 | 150ms | ease |
| Modal 弹出 | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 列表加载 | 400ms | ease-out |

### 6.2 关键动画

```css
/* 卡片悬停 */
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.3);
}

/* 侧边栏项激活 */
.sidebar-item.active {
  background: rgba(99,102,241,0.15);
  color: #818cf8;
  border-right: 3px solid #818cf8;
}

/* Skill 卡片悬停 */
.skill-card:hover {
  border-color: #6366f1;
}

/* Agent 标签悬停 */
.agent-tag:hover {
  transform: scale(1.05);
}
```

---

## 7. 完整 Demo HTML

见 `skills-manager-demo.html` 文件，包含:
- Dashboard 完整布局
- 4个统计卡片
- 快捷操作区
- 最近活动列表
- Skills 列表（4个示例）
- Agents 状态卡片
- 安装 Modal

---

## 8. 图标使用

使用 **Font Awesome 6**，关键图标:

| 用途 | 图标 |
|------|------|
| Dashboard | `fa-home` |
| Skills | `fa-box` |
| Discover | `fa-compass` |
| Agents | `fa-robot` |
| Settings | `fa-cog` |
| Install | `fa-plus` |
| Update | `fa-arrow-up` |
| Delete | `fa-trash` |
| View | `fa-eye` |
| Search | `fa-search` |
| Sync | `fa-sync` |
| Export | `fa-file-export` |
| Notification | `fa-bell` |
| Check | `fa-check` |
| Close | `fa-times` |
| Warning | `fa-exclamation-triangle` |
| Info | `fa-info-circle` |
| GitHub | `fa-github` |
| Folder | `fa-folder` |
| Database | `fa-database` |
| Code | `fa-code` |
| Bug | `fa-bug` |
| Paint | `fa-paint-brush` |
| Branch | `fa-code-branch` |
| Cube | `fa-cube` |
| Robot | `fa-robot` |
| Mouse | `fa-mouse-pointer` |
| Paw | `fa-paw` |
| Shield | `fa-shield-alt` |
| Download | `fa-download` |
| Upload | `fa-upload` |
| Arrow Right | `fa-arrow-right` |
| Filter | `fa-filter` |
| Sort | `fa-sort` |
| Star | `fa-star` |

---

## 9. 实现建议

### 9.1 技术栈
- **框架**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **图标**: Font Awesome / Lucide React
- **状态**: Zustand
- **路由**: React Router

### 9.2 组件拆分

```
components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Layout.tsx
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Badge.tsx
│   └── Tag.tsx
├── skills/
│   ├── SkillCard.tsx
│   ├── SkillList.tsx
│   ├── SkillDetail.tsx
│   └── InstallModal.tsx
├── stats/
│   └── StatCard.tsx
├── agents/
│   ├── AgentCard.tsx
│   └── AgentSelector.tsx
└── discover/
    ├── SearchBar.tsx
    ├── FilterTabs.tsx
    └── SkillDiscoveryCard.tsx
```

### 9.3 状态管理

```typescript
// stores/ui.ts
interface UIState {
  sidebarCollapsed: boolean;
  currentPage: string;
  modalOpen: boolean;
  modalType: 'install' | 'update' | 'delete' | null;
}

// stores/skills.ts
interface SkillsState {
  skills: Skill[];
  isLoading: boolean;
  searchQuery: string;
  selectedAgent: AgentType | 'all';
  sortBy: 'name' | 'date' | 'update';
}

// stores/discover.ts
interface DiscoverState {
  query: string;
  results: DiscoveredSkill[];
  filter: 'all' | 'official' | 'github';
  loading: boolean;
}
```
