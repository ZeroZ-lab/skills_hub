# 开发指南

**文档编号**: SM-DEV-001
**版本**: 0.3.0
**状态**: 草案
**最后更新**: 2026-03-01

---

## 1. 开发环境搭建

### 1.1 前置依赖

| 工具 | 版本要求 | 安装方式 | 用途 |
|------|---------|---------|------|
| **Rust** | 1.75+ | [rustup.rs](https://rustup.rs/) | Tauri 后端编译 |
| **Node.js** | 20 LTS+ | [nvm](https://github.com/nvm-sh/nvm) 推荐 | 前端构建工具链 |
| **pnpm** | 9.x | `npm install -g pnpm` | Monorepo 包管理 |
| **Tauri CLI** | 2.x | `cargo install tauri-cli --version "^2"` | Tauri 命令行 |
| **Git** | 2.30+ | 系统自带 | 版本控制 |

**平台特定依赖**:

```bash
# macOS — Xcode Command Line Tools
xcode-select --install

# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget \
  file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Windows — Visual Studio Build Tools (C++ Desktop workload)
winget install Microsoft.VisualStudio.2022.BuildTools
```

### 1.2 项目初始化

```bash
# 克隆仓库
git clone https://github.com/your-org/skills-manager
cd skills-manager

# 安装所有依赖（前端 + core 包）
pnpm install

# 验证 Rust 工具链
rustc --version
cargo --version

# 验证 Tauri CLI
cargo tauri --version
```

### 1.3 环境变量（可选）

```bash
# .env.local（不提交到 Git）
GITHUB_TOKEN=ghp_xxxxx           # GitHub API Token，提升速率限制
SKILLS_SH_API_KEY=xxx            # skills.sh API Key（如有）
TAURI_DEBUG=1                    # 启用 Tauri 调试日志
```

---

## 2. 项目结构

```
skills-manager/
├── packages/
│   └── core/                     # 共享类型与前端 invoke/event 适配（TypeScript）
│       ├── src/
│       │   ├── types/            # 公共类型定义
│       │   ├── commands/         # Tauri invoke 契约包装
│       │   ├── events/           # 事件 payload 类型
│       │   └── utils/            # 轻量前端工具函数
│       ├── tests/                # 单元测试
│       └── package.json
│
├── apps/
│   └── desktop/                  # Tauri 桌面应用
│       ├── src/                  # React 前端
│       │   ├── components/       # UI 组件
│       │   ├── pages/            # 页面组件
│       │   ├── hooks/            # 自定义 Hooks
│       │   ├── stores/           # Zustand 状态管理
│       │   └── lib/              # 工具库
│       ├── src-tauri/            # Rust 后端
│       │   ├── src/
│       │   │   ├── commands/     # Tauri Commands
│       │   │   ├── services/     # Skills 与 MCP 主业务逻辑
│       │   │   ├── agent/        # Agent 检测与目录管理
│       │   │   ├── git/          # Rust Git 操作
│       │   │   ├── mcp/          # MCP 格式转换
│       │   │   ├── fs/           # 文件操作
│       │   │   ├── deeplink/     # 深度链接
│       │   │   └── main.rs       # 入口
│       │   └── Cargo.toml
│       └── package.json
│
├── pnpm-workspace.yaml
└── package.json
```

### 2.1 核心模块职责

| 模块 | 职责 | 入口文件 |
|------|------|---------|
| `packages/core/types` | 前后端共享业务类型 | `index.ts` |
| `packages/core/commands` | `invoke()` 的 TS 契约包装 | `index.ts` |
| `packages/core/events` | Tauri 事件 payload 类型 | `index.ts` |
| `src-tauri/commands` | Tauri 命令入口 | `mod.rs` / `*.rs` |
| `src-tauri/services` | Skills 与 MCP 主业务逻辑 | `*.rs` |
| `src-tauri/mcp` | MCP 格式转换与同步 | `mod.rs` |
| `src-tauri/git` | clone/pull/checkout、hash 计算 | `mod.rs` |
| `src-tauri/agent` | Agent 检测、目录管理、Registry | `mod.rs` |

---

## 3. 开发工作流

### 3.1 启动开发模式

```bash
# 同时启动前端 (Vite HMR) + Rust 后端 (热重载)
pnpm tauri dev

# 仅启动前端（不启动 Tauri 窗口，用浏览器调试）
pnpm --filter desktop dev

# 仅编译 Rust 后端
cd apps/desktop/src-tauri && cargo build
```

### 3.2 分支策略

```
main              ← 稳定分支，保护分支
├── develop       ← 开发主分支
├── feature/*     ← 功能分支（如 feature/mcp-engine）
├── fix/*         ← 修复分支
└── release/*     ← 发布分支
```

**工作流**:

1. 从 `develop` 创建 `feature/xxx` 分支
2. 开发完成后创建 PR 到 `develop`
3. Code Review 通过后合并
4. `develop` 积累足够功能后合并到 `release/vX.Y.Z`
5. 发布后合并到 `main` 并打 Tag

### 3.3 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Type 列表**:

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(mcp): add format converter` |
| `fix` | Bug 修复 | `fix(lock): handle concurrent write` |
| `refactor` | 重构 | `refactor(provider): extract base class` |
| `docs` | 文档变更 | `docs: update API reference` |
| `test` | 测试 | `test(engine): add install tests` |
| `chore` | 构建/工具 | `chore: update dependencies` |
| `perf` | 性能优化 | `perf(git): use shallow clone` |

**Scope 列表**: `engine`, `mcp`, `provider`, `lock`, `agent`, `git`, `ui`, `commands`, `deeplink`

---

## 4. 编码规范

### 4.1 TypeScript 规范

```typescript
// 使用 strict 模式
// tsconfig.json: "strict": true

// 优先使用 interface 而非 type（可扩展性更好）
export interface Skill {
  id: string;
  name: string;
  // ...
}

// 错误处理：使用自定义 Error 类
export class SkillExistsError extends Error {
  constructor(name: string) {
    super(`Skill "${name}" already exists`);
    this.name = 'SkillExistsError';
  }
}

// 异步操作：始终使用 async/await
async function installSkill(source: string): Promise<Skill> {
  const parsed = await sourceParser.parse(source);
  const provider = providerRegistry.findProvider(parsed);
  // ...
}

// 导入排序：外部库 → 内部模块 → 类型
import { invoke } from '@tauri-apps/api/core';
import { SkillEngine } from '../engine';
import type { Skill, InstallOptions } from '../types';
```

**ESLint + Prettier**:

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### 4.2 Rust 规范

```rust
// 使用 clippy 保持代码质量
// #![warn(clippy::all)]

// 错误处理：使用 thiserror 定义内部错误类型
use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug)]
pub enum CommandError {
    #[error("Skill \"{0}\" not found")]
    SkillNotFound(String),

    #[error("MCP config error: {0}")]
    MCPConfigError(String),

    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
}

// 统一序列化为前端 API 合约格式 { code, message, details }
// 确保与 TAURI-COMMANDS.md 中定义的 CommandError 接口一致
#[derive(Serialize)]
struct SerializedError {
    code: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<String>,
}

impl From<CommandError> for tauri::InvokeError {
    fn from(err: CommandError) -> Self {
        let (code, details) = match &err {
            CommandError::SkillNotFound(_) => ("SKILL_NOT_FOUND", None),
            CommandError::MCPConfigError(d) => ("MCP_CONFIG_ERROR", Some(d.clone())),
            CommandError::NetworkError(e) => ("NETWORK_ERROR", Some(e.to_string())),
        };
        let serialized = SerializedError {
            code: code.to_string(),
            message: err.to_string(),
            details,
        };
        tauri::InvokeError::from(serde_json::to_value(serialized).unwrap())
    }
}

// Tauri Command 签名规范
#[tauri::command]
async fn list_skills(
    agent: Option<String>,
    scope: Option<String>,
) -> Result<Vec<Skill>, CommandError> {
    // 实现...
}

// 原子文件写入
use std::fs;
use tempfile::NamedTempFile;

fn atomic_write(path: &Path, content: &str) -> Result<(), io::Error> {
    let dir = path.parent().unwrap();
    let mut tmp = NamedTempFile::new_in(dir)?;
    tmp.write_all(content.as_bytes())?;
    tmp.persist(path)?;
    Ok(())
}
```

**Cargo Clippy + Rustfmt**:

```toml
# rustfmt.toml
edition = "2021"
max_width = 100
use_field_init_shorthand = true
```

### 4.3 React 组件规范

**使用 shadcn/ui 组件**：

```tsx
// 优先使用 shadcn/ui 组件
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface StatCardProps {
  title: string;
  value: number;
  color: 'blue' | 'purple' | 'indigo' | 'amber' | 'green';
  icon: React.ReactNode;
}

export function StatCard({ title, value, color, icon }: StatCardProps) {
  return (
    <Card className={`stat-card--${color}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="stat-card__icon">{icon}</div>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
```

**自定义组件规范**：

```tsx
// 仅在 shadcn/ui 无法满足需求时创建自定义组件
// 使用 cn() 工具合并 className
import { cn } from "@/lib/utils"

interface CustomComponentProps {
  className?: string;
  children: React.ReactNode;
}

export function CustomComponent({ className, children }: CustomComponentProps) {
  return (
    <div className={cn("base-styles", className)}>
      {children}
    </div>
  );
}
```

**Zustand Store 规范**：

```tsx
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface SkillsState {
  skills: Skill[];
  isLoading: boolean;
  error: string | null;
  fetchSkills: () => Promise<void>;
}

export const useSkillsStore = create<SkillsState>((set) => ({
  skills: [],
  isLoading: false,
  error: null,
  fetchSkills: async () => {
    set({ isLoading: true, error: null });
    try {
      const skills = await invoke<Skill[]>('list_skills');
      set({ skills, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },
}));
```

### 4.4 样式规范

使用 **Tailwind CSS 3.x**，遵循 [UI 设计规范](../03-design/UI-DESIGN-SPEC.md)：

```tsx
// 优先使用 Tailwind 类名
<div className="bg-[#1e1e2e] border border-[#2d2d44] rounded-xl p-6
  hover:translate-y-[-2px] hover:shadow-lg transition-all duration-200">
  {/* ... */}
</div>

// 复杂样式抽取为 Tailwind @apply
// styles/components.css
@layer components {
  .stat-card {
    @apply bg-[#1e1e2e] border border-[#2d2d44] rounded-xl p-6
      transition-all duration-200 ease-out;
  }
  .stat-card:hover {
    @apply -translate-y-0.5 shadow-lg;
  }
}
```

---

## 5. 测试策略

### 5.1 测试层级

```
┌────────────────────────────────┐
│       E2E 测试 (Tauri)         │  — 端到端用户流程
├────────────────────────────────┤
│     集成测试 (Rust + TS)       │  — 模块间交互
├────────────────────────────────┤
│     单元测试 (Vitest + Cargo)  │  — 函数/方法级别
└────────────────────────────────┘
```

### 5.2 单元测试

**TypeScript（Vitest）**:

```typescript
// packages/core/tests/command-contracts.test.ts
import { describe, it, expect } from 'vitest';
import type { Skill } from '../src/types';

describe('command contracts', () => {
  it('should allow installs[] on Skill', () => {
    const skill: Skill = {
      id: 'pr-review',
      name: 'pr-review',
      description: 'Review pull requests',
      source: { type: 'github', url: 'https://github.com/vercel-labs/skills' },
      canonicalPath: '~/.agents/skills/pr-review',
      tags: [],
      installs: [],
      updatedAt: new Date(),
      contentHash: 'sha256:abc',
    };

    expect(skill.installs).toEqual([]);
  });
});
```

**Rust（cargo test）**:

```rust
// src-tauri/src/mcp/converter.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_json_to_toml_conversion() {
        let server = MCPServerConfig::Stdio {
            command: "npx".to_string(),
            args: vec!["-y".to_string(), "@mcp/server-fs".to_string()],
            env: None,
        };
        let result = convert_to_format(&server, ConfigFormat::Toml);
        assert!(result.is_ok());
        let toml_str = result.unwrap();
        assert!(toml_str.contains("command = \"npx\""));
    }
}
```

### 5.3 运行测试

```bash
# TypeScript 单元测试
pnpm --filter core test

# TypeScript 测试覆盖率
pnpm --filter core test -- --coverage

# Rust 单元测试
cd apps/desktop/src-tauri && cargo test

# Rust clippy 检查
cd apps/desktop/src-tauri && cargo clippy -- -D warnings

# 全量检查（CI）
pnpm test && cd apps/desktop/src-tauri && cargo test && cargo clippy
```

### 5.4 测试覆盖率目标

| 模块 | 最低覆盖率 | 说明 |
|------|----------|------|
| `packages/core/types` | 90% | 前后端契约必须稳定 |
| Rust `lock/` | 85% | 数据完整性关键 |
| Rust `mcp/` | 85% | 格式转换与同步不可出错 |
| Rust `provider/` | 80% | 各 Provider 需独立测试 |
| Rust `services/` | 75% | 整体流程测试 |
| Rust `commands/` | 70% | Command 层薄封装 |
| React 组件 | 50% | 侧重交互逻辑测试 |

---

## 6. 构建与发布

### 6.1 开发构建

```bash
# Debug 构建（含 DevTools）
pnpm tauri dev

# Release 构建（本机平台）
pnpm tauri build
```

### 6.2 跨平台构建

```bash
# macOS（Intel + Apple Silicon Universal）
pnpm tauri build --target universal-apple-darwin

# Windows
pnpm tauri build --target x86_64-pc-windows-msvc

# Linux (deb + AppImage)
pnpm tauri build --bundles deb,appimage
```

### 6.3 CI/CD 流程

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm lint
      - run: cd apps/desktop/src-tauri && cargo clippy -- -D warnings

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm test
      - run: cd apps/desktop/src-tauri && cargo test

  build:
    needs: [lint, test]
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm tauri build
```

### 6.4 发布清单

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | 更新版本号 | `package.json` + `Cargo.toml` + `tauri.conf.json` |
| 2 | 更新 CHANGELOG | 记录本版本变更 |
| 3 | 全量测试通过 | `pnpm test && cargo test` |
| 4 | 创建 Release 分支 | `release/vX.Y.Z` |
| 5 | 跨平台构建 | CI 自动触发三平台构建 |
| 6 | 签名与公证 | macOS: Apple 公证 / Windows: 代码签名 |
| 7 | 创建 GitHub Release | 上传构建产物 + Release Notes |
| 8 | 合并到 main | 打 Git Tag `vX.Y.Z` |

---

## 7. 调试技巧

### 7.1 前端调试

```bash
# Tauri DevTools（开发模式自动启用）
# 在 Tauri 窗口中按 F12 或 Cmd+Option+I 打开

# 查看 Tauri invoke 日志
TAURI_DEBUG=1 pnpm tauri dev
```

### 7.2 Rust 后端调试

```rust
// 使用 log crate 输出日志
use log::{info, warn, error, debug};

#[tauri::command]
async fn install_skill(source: String) -> Result<Skill, CommandError> {
    info!("Installing skill from: {}", source);
    debug!("Parsed source: {:?}", parsed);
    // ...
}
```

```bash
# 查看 Rust 日志
RUST_LOG=debug pnpm tauri dev
```

### 7.3 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| `pnpm tauri dev` 启动失败 | Rust 工具链未安装 | `rustup update` |
| WebView 空白 | 前端构建错误 | 检查 Vite 控制台输出 |
| `invoke()` 无响应 | Command 未注册 | 检查 `main.rs` 中 `.invoke_handler()` |
| Symlink 创建失败 | Windows 需管理员权限 | 以管理员身份运行或使用 Copy 模式 |
| GitHub API 429 | 速率限制 | 配置 `GITHUB_TOKEN` |
| Lock 文件损坏 | 并发写入 | 删除 Lock 文件后重新安装 |

---

## 8. 目录约定与文件存放

### 8.1 运行时目录

```
~/.agents/
├── skills/                      # Canonical Path（SSOT）
│   ├── pr-review/
│   └── code-review/
└── .skill-lock.json             # 全局 Lock 文件

~/.skills-manager/
├── cache/                       # Git 仓库缓存
├── config.yaml                  # 应用配置
├── mcp-servers.json             # 全局 MCP 配置（本机本地使用，导出时默认脱敏）
└── logs/                        # 操作日志
```

### 8.2 Agent 配置文件位置

| Agent | MCP 配置路径 | 格式 |
|-------|-------------|------|
| Claude Code | `~/.claude.json` | JSON |
| Cursor | `~/.cursor/mcp.json` | JSON |
| Codex | `~/.codex/config.toml` | TOML |
| Gemini CLI | `~/.gemini/settings.json` | JSON |
| OpenCode | `~/.config/opencode/opencode.json` | JSON |

---

*相关文档: [系统设计](../02-architecture/SYSTEM-DESIGN.md) · [Tauri Commands](../04-api/TAURI-COMMANDS.md) · [UI 设计规范](../03-design/UI-DESIGN-SPEC.md)*
