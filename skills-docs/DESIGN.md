# Skills Manager 开源版 - 软件设计文档 (SDD)
> ⚠️ **已归档** — 此文件为 v0.2.0 草案，已被 [02-architecture/SYSTEM-DESIGN.md](./02-architecture/SYSTEM-DESIGN.md) 取代，请勿参考。


**版本**: 0.2.0  
**日期**: 2026-03-01  
**状态**: 草案  
**架构**: 完全自研（Core Engine + Tauri Frontend）

---

## 1. 架构概述

### 1.1 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 桌面框架 | Tauri | 2.x | 跨平台桌面应用 |
| 前端框架 | React | 18.x | UI 界面 |
| 语言 | TypeScript | 5.x | 前端 + Core |
| 后端语言 | Rust | 1.75+ | Tauri 命令 |
| 构建工具 | Vite | 5.x | 前端构建 |
| 状态管理 | Zustand | 4.x | 前端状态 |
| 样式 | Tailwind CSS | 3.x | UI 样式 |
| Git 操作 | git2-rs | - | Rust Git 库 |
| 文件系统 | tokio::fs | - | 异步文件操作 |

### 1.2 架构图（自研版）

```
┌─────────────────────────────────────────────────────────────────┐
│                     桌面应用层 (Tauri)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    前端 (React)                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │  Pages   │ │Components│ │  Stores  │ │  Hooks   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────┼─────────────────────────────┐      │
│  │                    Tauri Commands                     │      │
│  │               (Rust + TypeScript Bridge)              │      │
│  └────────────────────────┼─────────────────────────────┘      │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│                   核心引擎层 (Core Engine)                       │
│  ┌────────────────────────┼─────────────────────────────┐       │
│  │                    SkillEngine                        │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │       │
│  │  │ Install  │ │  Update  │ │  Remove  │ │  Search  │ │       │
│  │  │ Manager  │ │ Manager  │ │ Manager  │ │ Manager  │ │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │       │
│  │  │   Git    │ │  Source  │ │   Lock   │ │   Agent  │ │       │
│  │  │  Client  │ │  Parser  │ │  Manager │ │  Manager │ │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │       │
│  └──────────────────────────────────────────────────────┘       │
│                           │                                     │
│  ┌────────────────────────┼─────────────────────────────┐       │
│  │                    数据层                             │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │       │
│  │  │ Git Repo │ │  Files   │ │   Lock   │ │  Config  │ │       │
│  │  │(Clone/  │ │ (Symlink│ │  File    │ │  File    │ │       │
│  │  │  Pull)  │ │  /Copy) │ │          │ │          │ │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 核心引擎架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        SkillEngine                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ InstallManager  │    │ UpdateManager   │    │RemoveManager│ │
│  │                 │    │                 │    │             │ │
│  │ • install()     │    │ • check()       │    │ • remove()  │ │
│  │ • batchInstall()│    │ • update()      │    │ • clean()   │ │
│  │                 │    │ • rollback()    │    │             │ │
│  └────────┬────────┘    └────────┬────────┘    └──────┬──────┘ │
│           │                      │                    │        │
│           └──────────────────────┼────────────────────┘        │
│                                  │                             │
│  ┌───────────────────────────────┼─────────────────────────┐   │
│  │                               ▼                         │   │
│  │                    ┌─────────────────┐                  │   │
│  │                    │   GitManager    │                  │   │
│  │                    │                 │                  │   │
│  │                    │ • clone()       │                  │   │
│  │                    │ • pull()        │                  │   │
│  │                    │ • getHash()     │                  │   │
│  │                    │ • checkout()    │                  │   │
│  │                    └────────┬────────┘                  │   │
│  │                             │                           │   │
│  │  ┌──────────────────────────┼────────────────────────┐  │   │
│  │  │                          ▼                        │  │   │
│  │  │              ┌─────────────────────┐              │  │   │
│  │  │              │     git2-rs         │              │  │   │
│  │  │              │   (Rust Git Lib)    │              │  │   │
│  │  │              └─────────────────────┘              │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │   │
│  │  │SourceParser  │ │ LockManager  │ │AgentManager  │    │   │
│  │  │              │ │              │ │              │    │   │
│  │  │• parseURL() │ │• readLock()  │ │• detect()    │    │   │
│  │  │• parsePath()│ │• writeLock() │ │• getSkillsDir│    │   │
│  │  │• resolve()  │ │• validate()  │ │• installTo() │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 模块设计

### 2.1 项目结构

```
skills-manager/
├── packages/
│   └── core/                      # 核心引擎 (TypeScript)
│       ├── src/
│       │   ├── engine/           # 核心引擎
│       │   │   ├── index.ts
│       │   │   ├── install.ts    # 安装逻辑
│       │   │   ├── update.ts     # 更新逻辑
│       │   │   ├── remove.ts     # 删除逻辑
│       │   │   └── search.ts     # 搜索逻辑
│       │   ├── git/              # Git 操作
│       │   │   ├── index.ts
│       │   │   ├── clone.ts
│       │   │   ├── pull.ts
│       │   │   └── utils.ts
│       │   ├── source/           # 源解析
│       │   │   ├── index.ts
│       │   │   ├── parser.ts     # URL/Path 解析
│       │   │   └── resolver.ts   # 源解析器
│       │   ├── lock/             # Lock 文件管理
│       │   │   ├── index.ts
│       │   │   ├── reader.ts
│       │   │   ├── writer.ts
│       │   │   └── validator.ts
│       │   ├── agent/            # Agent 管理
│       │   │   ├── index.ts
│       │   │   ├── detector.ts   # 自动检测
│       │   │   ├── registry.ts   # Agent 注册表
│       │   │   └── config.ts     # 配置文件
│       │   ├── types/            # 类型定义
│       │   │   └── index.ts
│       │   └── utils/            # 工具函数
│       │       ├── fs.ts
│       │       ├── hash.ts
│       │       └── path.ts
│       └── package.json
│
├── apps/
│   └── desktop/                   # Tauri 桌面应用
│       ├── src/
│       │   ├── components/       # React 组件
│       │   ├── pages/            # 页面
│       │   ├── hooks/            # Hooks
│       │   ├── stores/           # Zustand stores
│       │   └── lib/              # 工具
│       └── src-tauri/            # Rust 后端
│           ├── src/
│           │   ├── commands/     # Tauri 命令
│           │   │   ├── skills.rs
│           │   │   ├── agents.rs
│           │   │   └── search.rs
│           │   ├── git/          # Git 操作 (Rust)
│           │   │   ├── mod.rs
│           │   │   ├── clone.rs
│           │   │   └── utils.rs
│           │   ├── fs/           # 文件操作
│           │   │   └── mod.rs
│           │   └── main.rs
│           └── Cargo.toml
```

### 2.2 Core Engine 设计

#### 核心类型定义

```typescript
// packages/core/src/types/index.ts

export interface Skill {
  id: string;                    // 唯一标识 (name-hash)
  name: string;                  // 显示名称
  description: string;           // 描述
  source: Source;                // 来源信息
  path: string;                  // 本地路径
  version?: string;              // 版本号
  author?: string;               // 作者
  tags: string[];                // 标签
  agents: AgentType[];           // 已安装的 Agents
  installedAt: Date;             // 安装时间
  updatedAt: Date;               // 更新时间
  skillHash: string;             // 内容哈希
  metadata?: SkillMetadata;      // 额外元数据
}

export interface Source {
  type: 'github' | 'gitlab' | 'git' | 'local' | 'zip';
  url: string;                   // 完整 URL
  subpath?: string;              // 子目录路径
  ref?: string;                  // branch/tag/commit
}

export interface ParsedSource {
  type: Source['type'];
  owner?: string;                // GitHub/GitLab owner
  repo?: string;                 // 仓库名
  url: string;                   // 完整 URL
  subpath?: string;              // skill 子路径
  ref?: string;                  // git ref
  skillName?: string;            // @ 语法指定的 skill
}

export type AgentType = 
  | 'claude-code' 
  | 'cursor' 
  | 'github-copilot'
  | 'openclaw'
  | 'codex'
  | 'cline'
  | 'continue'
  | 'universal';

export interface AgentConfig {
  type: AgentType;
  displayName: string;
  description?: string;
  skillsDir: string;             // 相对或绝对路径
  globalSkillsDir?: string;      // 全局安装路径
  detectCommand?: string;        // 检测命令
  detectPaths?: string[];        // 检测路径（备用）
}

export interface LockEntry {
  name: string;
  source: Source;
  skillPath?: string;            // 子路径
  skillFolderHash: string;       // 目录内容哈希
  installedAt: string;           // ISO 8601
  updatedAt: string;
  agents: AgentType[];
}

export interface LockFile {
  version: number;
  skills: Record<string, LockEntry>;
}

export interface InstallOptions {
  agents: AgentType[];           // 目标 Agents
  mode: 'symlink' | 'copy';      // 安装模式
  ref?: string;                  // 指定 git ref
  subpath?: string;              // 子目录
  force?: boolean;               // 强制覆盖
}

export interface UpdateOptions {
  agents?: AgentType[];          // 指定 Agents（默认全部）
  dryRun?: boolean;              // 只检查不更新
}

export interface RemoveOptions {
  clean?: boolean;               // 清理共享文件
  agents?: AgentType[];          // 从指定 Agents 移除
}
```

#### SkillEngine 主类

```typescript
// packages/core/src/engine/index.ts

export class SkillEngine {
  private git: GitManager;
  private lock: LockManager;
  private agent: AgentManager;
  private source: SourceParser;
  private config: ConfigManager;

  constructor(options: EngineOptions) {
    this.git = new GitManager(options.git);
    this.lock = new LockManager(options.lockFilePath);
    this.agent = new AgentManager(options.agentsConfigPath);
    this.source = new SourceParser();
    this.config = new ConfigManager(options.configPath);
  }

  // === Skills 管理 ===
  
  async list(options?: ListOptions): Promise<Skill[]> {
    const entries = await this.lock.readAll();
    const skills = await Promise.all(
      entries.map(e => this.hydrateSkill(e))
    );
    return this.filterSkills(skills, options);
  }

  async install(source: string, options: InstallOptions): Promise<Skill> {
    // 1. 解析源
    const parsed = await this.source.parse(source);
    
    // 2. 检查是否已存在
    const existing = await this.lock.findBySource(parsed);
    if (existing && !options.force) {
      throw new SkillExistsError(existing.name);
    }

    // 3. 克隆/复制到缓存目录
    const cachePath = await this.git.cloneOrPull(parsed);
    
    // 4. 解析 SKILL.md
    const skillDir = parsed.subpath 
      ? path.join(cachePath, parsed.subpath)
      : cachePath;
    const metadata = await this.parseSkillMetadata(skillDir);
    
    // 5. 安装到目标 Agents
    for (const agent of options.agents) {
      await this.installToAgent(skillDir, agent, options.mode);
    }

    // 6. 更新 lock 文件
    const skill = await this.createSkill(metadata, parsed, options);
    await this.lock.add(skill);

    return skill;
  }

  async update(name: string, options?: UpdateOptions): Promise<Skill> {
    const entry = await this.lock.get(name);
    if (!entry) throw new SkillNotFoundError(name);

    // 1. 检查更新
    const hasUpdate = await this.checkUpdate(entry);
    if (!hasUpdate) return this.hydrateSkill(entry);

    // 2. 拉取最新代码
    const cachePath = await this.git.pull(entry.source);
    
    // 3. 重新安装
    const skillDir = entry.skillPath
      ? path.join(cachePath, entry.skillPath)
      : cachePath;

    const agents = options?.agents || entry.agents;
    for (const agent of agents) {
      await this.installToAgent(skillDir, agent, 'copy');
    }

    // 4. 更新 lock
    await this.lock.update(name, { 
      skillFolderHash: await this.computeHash(skillDir),
      updatedAt: new Date().toISOString(),
    });

    return this.hydrateSkill(await this.lock.get(name)!);
  }

  async remove(name: string, options?: RemoveOptions): Promise<void> {
    const entry = await this.lock.get(name);
    if (!entry) throw new SkillNotFoundError(name);

    const agents = options?.agents || entry.agents;

    // 1. 从 Agents 中移除
    for (const agent of agents) {
      await this.removeFromAgent(name, agent);
    }

    // 2. 更新 lock
    const remainingAgents = entry.agents.filter(a => !agents.includes(a));
    if (remainingAgents.length === 0) {
      await this.lock.remove(name);
      if (options?.clean) {
        await this.cleanCache(entry);
      }
    } else {
      await this.lock.update(name, { agents: remainingAgents });
    }
  }

  // === 发现与搜索 ===

  async searchInstalled(query: string): Promise<Skill[]> {
    const all = await this.list();
    return this.fuzzySearch(all, query);
  }

  async discover(query: string): Promise<DiscoveredSkill[]> {
    // 1. 搜索 GitHub
    const githubResults = await this.searchGitHub(query);
    
    // 2. 搜索本地索引
    const localResults = await this.searchLocalIndex(query);
    
    // 3. 合并去重
    return this.mergeResults(githubResults, localResults);
  }

  async getTrending(): Promise<DiscoveredSkill[]> {
    return this.github.getTrending('skill', 'javascript');
  }

  // === 工具方法 ===

  private async installToAgent(
    skillDir: string, 
    agent: AgentType, 
    mode: 'symlink' | 'copy'
  ): Promise<void> {
    const agentDir = await this.agent.getSkillsDir(agent);
    const skillName = path.basename(skillDir);
    const targetPath = path.join(agentDir, skillName);

    if (mode === 'symlink') {
      await fs.ensureSymlink(skillDir, targetPath);
    } else {
      await fs.copy(skillDir, targetPath);
    }
  }

  private async removeFromAgent(name: string, agent: AgentType): Promise<void> {
    const agentDir = await this.agent.getSkillsDir(agent);
    const skillPath = path.join(agentDir, name);
    await fs.remove(skillPath);
  }

  private async parseSkillMetadata(skillDir: string): Promise<SkillMetadata> {
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    const content = await fs.readFile(skillMdPath, 'utf-8');
    return parseSkillMd(content);
  }

  private async checkUpdate(entry: LockEntry): Promise<boolean> {
    if (entry.source.type === 'local') return false;
    
    const latestHash = await this.git.getLatestHash(entry.source);
    return latestHash !== entry.skillFolderHash;
  }
}
```

### 2.3 Source Parser（源解析器）

```typescript
// packages/core/src/source/parser.ts

export class SourceParser {
  // 支持多种 URL 格式
  private patterns = {
    // GitHub shorthand: owner/repo
    githubShorthand: /^([\w-]+)\/([\w-]+)(?:@(.+))?$/,
    
    // GitHub URL: https://github.com/owner/repo
    githubUrl: /https?:\/\/github\.com\/([\w-]+)\/([\w-]+)/,
    
    // GitLab URL
    gitlabUrl: /https?:\/\/gitlab\.com\/([\w-]+)\/([\w-]+)/,
    
    // With subpath: owner/repo/path/to/skill
    // With @skill: owner/repo@skill-name
    withSubpath: /^(?:https?:\/\/[^\/]+\/)?([\w-]+)\/([\w-]+)(?:\/(.*))?$/,
    withSkill: /^(?:https?:\/\/[^\/]+\/)?([\w-]+)\/([\w-]+)@([\w-]+)$/,
    
    // Local path
    localPath: /^(\.\.?\/|\/|~\/|[a-zA-Z]:\\)/,
  };

  async parse(input: string): Promise<ParsedSource> {
    // 1. 尝试解析为 GitHub shorthand
    const shorthand = this.parseShorthand(input);
    if (shorthand) return shorthand;

    // 2. 尝试解析为完整 URL
    const urlParsed = this.parseUrl(input);
    if (urlParsed) return urlParsed;

    // 3. 尝试解析为本地路径
    const localParsed = await this.parseLocal(input);
    if (localParsed) return localParsed;

    throw new InvalidSourceError(`无法解析源: ${input}`);
  }

  private parseShorthand(input: string): ParsedSource | null {
    // user/repo@skill-name
    const match = input.match(/^([\w-]+)\/([\w-]+)(?:@([\w-]+))?(?:#(.+))?$/);
    if (!match) return null;

    const [, owner, repo, skillName, ref] = match;
    return {
      type: 'github',
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
      skillName,
      ref,
    };
  }

  private parseUrl(input: string): ParsedSource | null {
    // https://github.com/user/repo/tree/main/path/to/skill
    // https://github.com/user/repo@skill-name
    
    try {
      const url = new URL(input);
      
      if (url.hostname === 'github.com') {
        const parts = url.pathname.split('/').filter(Boolean);
        const [owner, repo, ...rest] = parts;
        
        // 解析 tree/blob 路径
        let subpath: string | undefined;
        let ref: string | undefined;
        
        if (rest[0] === 'tree' || rest[0] === 'blob') {
          ref = rest[1];
          subpath = rest.slice(2).join('/');
        }

        return {
          type: 'github',
          owner,
          repo,
          url: `https://github.com/${owner}/${repo}`,
          subpath,
          ref,
        };
      }

      // GitLab 类似处理...
      
    } catch {
      return null;
    }
  }

  private async parseLocal(input: string): Promise<ParsedSource | null> {
    const expanded = expandTilde(input);
    const resolved = path.resolve(expanded);
    
    if (!await fs.pathExists(resolved)) return null;
    
    // 验证是否是有效的 skill 目录
    const hasSkillMd = await fs.pathExists(path.join(resolved, 'SKILL.md'));
    if (!hasSkillMd) {
      // 可能是父目录，尝试查找子目录中的 skill
      const subdirs = await fs.readdir(resolved, { withFileTypes: true });
      for (const dir of subdirs.filter(d => d.isDirectory())) {
        const skillPath = path.join(resolved, dir.name, 'SKILL.md');
        if (await fs.pathExists(skillPath)) {
          return {
            type: 'local',
            url: resolved,
            subpath: dir.name,
          };
        }
      }
    }

    return {
      type: 'local',
      url: resolved,
    };
  }
}
```

### 2.4 Git Manager

```typescript
// packages/core/src/git/index.ts

export class GitManager {
  private cacheDir: string;

  constructor(options: { cacheDir: string }) {
    this.cacheDir = options.cacheDir;
  }

  // 获取或创建缓存目录
  async cloneOrPull(source: ParsedSource): Promise<string> {
    const repoDir = this.getRepoCacheDir(source);
    
    if (await fs.pathExists(repoDir)) {
      // 已存在，执行 pull
      await this.pull(source, repoDir);
    } else {
      // 不存在，执行 clone
      await this.clone(source, repoDir);
    }

    // 如果指定了 ref，checkout
    if (source.ref) {
      await this.checkout(repoDir, source.ref);
    }

    return repoDir;
  }

  private async clone(source: ParsedSource, targetDir: string): Promise<void> {
    await fs.ensureDir(path.dirname(targetDir));
    
    const args = ['clone', '--depth', '1'];
    if (source.ref) args.push('--branch', source.ref);
    args.push(source.url, targetDir);

    await execa('git', args);
  }

  private async pull(source: ParsedSource, repoDir: string): Promise<void> {
    await execa('git', ['-C', repoDir, 'pull', '--depth', '1']);
  }

  private async checkout(repoDir: string, ref: string): Promise<void> {
    await execa('git', ['-C', repoDir, 'checkout', ref]);
  }

  async getLatestHash(source: ParsedSource): Promise<string> {
    const { stdout } = await execa('git', [
      'ls-remote', source.url, 'HEAD'
    ]);
    return stdout.split('\t')[0];
  }

  async getCurrentHash(repoDir: string): Promise<string> {
    const { stdout } = await execa('git', [
      '-C', repoDir, 'rev-parse', 'HEAD'
    ]);
    return stdout.trim();
  }

  private getRepoCacheDir(source: ParsedSource): string {
    // ~/.skills-manager/cache/github/owner/repo
    const repoKey = `${source.type}/${source.owner}/${source.repo}`;
    return path.join(this.cacheDir, repoKey);
  }
}
```

### 2.5 Agent Manager

```typescript
// packages/core/src/agent/index.ts

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    type: 'claude-code',
    displayName: 'Claude Code',
    skillsDir: '.claude/skills',
    globalSkillsDir: '~/.claude/skills',
    detectCommand: 'which claude',
    detectPaths: ['~/.claude', '~/.config/claude'],
  },
  {
    type: 'cursor',
    displayName: 'Cursor',
    skillsDir: '.cursor/skills',
    globalSkillsDir: '~/.cursor/skills',
    detectCommand: 'which cursor',
    detectPaths: ['~/.cursor', '~/Library/Application Support/Cursor'],
  },
  {
    type: 'openclaw',
    displayName: 'OpenClaw',
    skillsDir: '.openclaw/skills',
    globalSkillsDir: '~/.openclaw/skills',
    detectCommand: 'which openclaw',
    detectPaths: ['~/.openclaw', '~/.config/openclaw'],
  },
  {
    type: 'universal',
    displayName: 'Universal',
    skillsDir: '.agents/skills',
    globalSkillsDir: '~/.agents/skills',
    detectPaths: ['.agents'],
  },
  // ... 其他 agents
];

export class AgentManager {
  private agents: Map<AgentType, AgentConfig>;
  private detected: Set<AgentType> = new Set();

  constructor(configPath?: string) {
    this.agents = new Map(
      DEFAULT_AGENTS.map(a => [a.type, a])
    );
    
    if (configPath) {
      this.loadCustomConfig(configPath);
    }
  }

  async detect(): Promise<AgentType[]> {
    const detected: AgentType[] = [];

    for (const [type, config] of this.agents) {
      const isInstalled = await this.checkAgentInstalled(config);
      if (isInstalled) {
        detected.push(type);
        this.detected.add(type);
      }
    }

    return detected;
  }

  private async checkAgentInstalled(config: AgentConfig): Promise<boolean> {
    // 1. 检查命令是否存在
    if (config.detectCommand) {
      try {
        await execa('sh', ['-c', config.detectCommand]);
        return true;
      } catch {}
    }

    // 2. 检查配置目录是否存在
    if (config.detectPaths) {
      for (const p of config.detectPaths) {
        if (await fs.pathExists(expandTilde(p))) {
          return true;
        }
      }
    }

    // 3. 检查 skills 目录是否存在
    const globalDir = config.globalSkillsDir 
      ? expandTilde(config.globalSkillsDir) 
      : null;
    if (globalDir && await fs.pathExists(globalDir)) {
      return true;
    }

    return false;
  }

  async getSkillsDir(agent: AgentType, global = false): Promise<string> {
    const config = this.agents.get(agent);
    if (!config) throw new Error(`Unknown agent: ${agent}`);

    const dir = global && config.globalSkillsDir
      ? config.globalSkillsDir
      : config.skillsDir;

    const expanded = expandTilde(dir);
    await fs.ensureDir(expanded);
    return expanded;
  }

  getConfig(agent: AgentType): AgentConfig | undefined {
    return this.agents.get(agent);
  }

  getAllConfigs(): AgentConfig[] {
    return Array.from(this.agents.values());
  }
}
```

### 2.6 Lock Manager

```typescript
// packages/core/src/lock/index.ts

const LOCK_VERSION = 1;
const LOCK_FILENAME = 'skills-lock.yaml';

export class LockManager {
  private lockPath: string;

  constructor(workspaceRoot: string) {
    this.lockPath = path.join(workspaceRoot, LOCK_FILENAME);
  }

  async readAll(): Promise<LockEntry[]> {
    if (!await fs.pathExists(this.lockPath)) {
      return [];
    }

    const content = await fs.readFile(this.lockPath, 'utf-8');
    const lockFile = yaml.parse(content) as LockFile;
    
    if (lockFile.version !== LOCK_VERSION) {
      await this.migrate(lockFile);
    }

    return Object.values(lockFile.skills);
  }

  async get(name: string): Promise<LockEntry | undefined> {
    const all = await this.readAll();
    return all.find(e => e.name === name);
  }

  async findBySource(source: ParsedSource): Promise<LockEntry | undefined> {
    const all = await this.readAll();
    return all.find(e => 
      e.source.url === source.url && 
      e.skillPath === source.subpath
    );
  }

  async add(skill: Skill): Promise<void> {
    const lockFile = await this.readFile();
    
    lockFile.skills[skill.name] = {
      name: skill.name,
      source: skill.source,
      skillPath: skill.source.subpath,
      skillFolderHash: skill.skillHash,
      installedAt: skill.installedAt.toISOString(),
      updatedAt: skill.updatedAt.toISOString(),
      agents: skill.agents,
    };

    await this.writeFile(lockFile);
  }

  async update(name: string, updates: Partial<LockEntry>): Promise<void> {
    const lockFile = await this.readFile();
    const entry = lockFile.skills[name];
    
    if (!entry) throw new SkillNotFoundError(name);

    lockFile.skills[name] = { ...entry, ...updates };
    await this.writeFile(lockFile);
  }

  async remove(name: string): Promise<void> {
    const lockFile = await this.readFile();
    delete lockFile.skills[name];
    await this.writeFile(lockFile);
  }

  private async readFile(): Promise<LockFile> {
    if (!await fs.pathExists(this.lockPath)) {
      return { version: LOCK_VERSION, skills: {} };
    }
    const content = await fs.readFile(this.lockPath, 'utf-8');
    return yaml.parse(content);
  }

  private async writeFile(lockFile: LockFile): Promise<void> {
    const content = yaml.stringify(lockFile, {
      indent: 2,
      sortMapEntries: true,
    });
    await fs.writeFile(this.lockPath, content);
  }
}
```

---

## 3. Tauri 后端（Rust）

### 3.1 Commands

```rust
// src-tauri/src/commands/skills.rs

use tauri::State;
use serde::{Deserialize, Serialize};
use crate::engine::SkillEngine;

#[derive(Serialize)]
struct SkillResponse {
    success: bool,
    data: Option<Skill>,
    error: Option<String>,
}

#[tauri::command]
pub async fn list_skills(
    engine: State<'_, SkillEngine>,
    agent: Option<String>,
) -> Result<Vec<Skill>, String> {
    engine.list(ListOptions { agent }).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn install_skill(
    engine: State<'_, SkillEngine>,
    source: String,
    agents: Vec<String>,
    mode: String,
) -> Result<Skill, String> {
    let options = InstallOptions {
        agents: agents.into_iter().map(|a| a.parse().unwrap()).collect(),
        mode: mode.parse().unwrap(),
        ..Default::default()
    };
    
    engine.install(&source, options).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_skill(
    engine: State<'_, SkillEngine>,
    name: String,
    agents: Option<Vec<String>>,
) -> Result<(), String> {
    let options = RemoveOptions {
        agents: agents.map(|a| a.into_iter().map(|s| s.parse().unwrap()).collect()),
        ..Default::default()
    };
    
    engine.remove(&name, options).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn discover_skills(
    query: String,
) -> Result<Vec<DiscoveredSkill>, String> {
    // 调用 GitHub API 搜索
    search_github_skills(&query).await
        .map_err(|e| e.to_string())
}
```

### 3.2 Git 操作（Rust）

```rust
// src-tauri/src/git/clone.rs

use git2::{Repository, FetchOptions};
use std::path::Path;

pub fn clone_or_pull(url: &str, target_dir: &Path) -> Result<Repository, git2::Error> {
    if target_dir.exists() {
        // Pull
        let repo = Repository::open(target_dir)?;
        let mut remote = repo.find_remote("origin")?;
        remote.fetch(&["main"], None, None)?;
        
        let fetch_head = repo.find_reference("FETCH_HEAD")?;
        let commit = repo.reference_to_annotated_commit(&fetch_head)?;
        
        repo.merge(&[&commit], None, None)?;
        Ok(repo)
    } else {
        // Clone
        let mut fetch_opts = FetchOptions::new();
        fetch_opts.depth(1);
        
        let mut builder = git2::build::RepoBuilder::new();
        builder.fetch_options(fetch_opts);
        
        builder.clone(url, target_dir)
    }
}
```

---

## 4. 前端状态管理

```typescript
// apps/desktop/src/stores/skills.ts

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

interface SkillsState {
  skills: Skill[];
  isLoading: boolean;
  error: string | null;
  selectedAgent: AgentType | 'all';
  searchQuery: string;

  // Actions
  fetchSkills: () => Promise<void>;
  installSkill: (source: string, agents: AgentType[]) => Promise<void>;
  removeSkill: (name: string) => Promise<void>;
  searchInstalled: (query: string) => Promise<Skill[]>;
  setSelectedAgent: (agent: AgentType | 'all') => void;
  setSearchQuery: (query: string) => void;
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  isLoading: false,
  error: null,
  selectedAgent: 'all',
  searchQuery: '',

  fetchSkills: async () => {
    set({ isLoading: true, error: null });
    try {
      const skills = await invoke<Skill[]>('list_skills', {
        agent: get().selectedAgent === 'all' ? null : get().selectedAgent,
      });
      set({ skills, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  installSkill: async (source, agents) => {
    set({ isLoading: true, error: null });
    try {
      const skill = await invoke<Skill>('install_skill', {
        source,
        agents,
        mode: 'symlink',
      });
      set(state => ({ 
        skills: [...state.skills, skill],
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  removeSkill: async (name) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('remove_skill', { name });
      set(state => ({
        skills: state.skills.filter(s => s.name !== name),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  // ... 其他 actions
}));
```

---

## 5. 构建与发布

### 5.1 开发流程

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 打包桌面应用
pnpm tauri build
```

### 5.2 发布流程

1. 版本号更新
2. 构建所有平台
3. 代码签名
4. 上传 GitHub Releases
5. 可选：自动更新服务器

---

## 6. 附录

### 6.1 关键特性对比

| 特性 | Vercel CLI | 本工具 |
|------|------------|--------|
| 依赖 Node.js | ✅ 必需 | ❌ 不需要 |
| 跨平台 | ✅ 是 | ✅ 是（原生）|
| 图形界面 | ❌ 否 | ✅ 是 |
| 多 Agent 管理 | ⚠️ 有限 | ✅ 完整 |
| Skill 发现 | ✅ 官方索引 | ✅ GitHub API |
| 离线使用 | ⚠️ 有限 | ✅ 支持 |
| 安装模式 | symlink/copy | symlink/copy |
| 自定义 Agent | ❌ 否 | ✅ 可配置 |

---

## 7. Skill 获取策略

### 7.1 获取方式概览

| 方式 | 适用场景 | 实现复杂度 | 优先级 |
|------|----------|------------|--------|
| **发现页面** | 浏览、搜索未知 skills | 中 | P1 |
| **GitHub URL** | 知道具体仓库的高级用户 | 低 | P0 |
| **本地导入** | 自己开发、离线场景 | 低 | P0 |
| **配置文件导入** | 团队共享、换机 | 低 | P1 |
| **一键安装链接** | 网页集成 | 中 | P2 |

### 7.2 详细设计

#### A. 发现页面 (Discover)

**功能定位**: 应用商店式浏览体验

**核心功能:**
- 搜索框（关键词搜索）
- 分类筛选（热门/最新/官方/适用）
- Skill 卡片列表（图标、名称、描述、评分、下载量）
- 一键安装

**数据来源:**
```typescript
interface DiscoveryProvider {
  name: string;
  search(query: string): Promise<DiscoveredSkill[]>;
  getTrending?(): Promise<DiscoveredSkill[]>;
  getFeatured?(): Promise<DiscoveredSkill[]>;
}

// 实现列表
const providers: DiscoveryProvider[] = [
  new GitHubSearchProvider(),      // GitHub API 搜索
  new OfficialRegistryProvider(),  // skills.sh 官方注册表
  new LocalCacheProvider(),        // 本地缓存
];
```

**GitHub 搜索实现:**
```typescript
class GitHubSearchProvider implements DiscoveryProvider {
  async search(query: string): Promise<DiscoveredSkill[]> {
    // 使用 GitHub Code Search API
    const searchQuery = `${query} filename:SKILL.md`;
    const results = await octokit.rest.search.code({
      q: searchQuery,
      per_page: 100,
    });

    return Promise.all(
      results.data.items.map(async (item) => {
        // 获取仓库信息和 SKILL.md 内容
        const [repo, readme] = await Promise.all([
          octokit.rest.repos.get({
            owner: item.repository.owner.login,
            repo: item.repository.name,
          }),
          this.fetchSkillMetadata(item),
        ]);

        return {
          name: item.name.replace('SKILL.md', ''),
          description: repo.data.description || '',
          source: `github:${item.repository.full_name}`,
          url: item.html_url,
          stars: item.repository.stargazers_count,
          author: item.repository.owner.login,
          verified: item.repository.owner.type === 'Organization',
          metadata: readme,
        };
      })
    );
  }
}
```

#### B. GitHub URL 直接安装

**支持的 URL 格式:**

| 格式 | 示例 | 说明 |
|------|------|------|
| Shorthand | `user/repo` | 自动找 skills 目录 |
| With skill | `user/repo@skill-name` | 指定子 skill |
| With branch | `user/repo#branch` | 指定分支 |
| Full URL | `https://github.com/user/repo` | 完整 URL |
| With path | `https://github.com/user/repo/tree/main/skills/name` | 指定子路径 |

**解析器实现:**
```typescript
class SourceParser {
  patterns = {
    // user/repo@skill#branch
    shorthand: /^([\w-]+)\/([\w-]+)(?:@([\w-]+))?(?:#(.+))?$/,
    
    // GitHub URL
    githubUrl: /https?:\/\/github\.com\/([\w-]+)\/([\w-]+)/,
    
    // With tree/blob path
    withPath: /\/tree\/([^\/]+)\/(.+)/,
  };

  parse(input: string): ParsedSource {
    // 1. 尝试 shorthand
    const shorthand = input.match(this.patterns.shorthand);
    if (shorthand) {
      return {
        type: 'github',
        owner: shorthand[1],
        repo: shorthand[2],
        skillName: shorthand[3],
        ref: shorthand[4],
        url: `https://github.com/${shorthand[1]}/${shorthand[2]}`,
      };
    }

    // 2. 尝试完整 URL
    // ...

    throw new InvalidSourceError(input);
  }
}
```

#### C. 本地目录导入

**使用场景:**
- 自己开发 skill
- 从同事那里拷贝的 skill
- 离线环境

**功能:**
- 文件选择器选择目录
- 自动验证 SKILL.md 格式
- 可选: Symlink 或 Copy 模式

```typescript
async function installFromLocal(
  localPath: string, 
  options: InstallOptions
): Promise<Skill> {
  // 1. 验证目录
  const skillMdPath = path.join(localPath, 'SKILL.md');
  if (!await fs.pathExists(skillMdPath)) {
    throw new Error('目录中未找到 SKILL.md');
  }

  // 2. 解析元数据
  const metadata = await parseSkillMd(
    await fs.readFile(skillMdPath, 'utf-8')
  );

  // 3. 安装到目标 Agents
  for (const agent of options.agents) {
    const targetDir = await getAgentSkillsDir(agent);
    const targetPath = path.join(targetDir, metadata.name);

    if (options.mode === 'symlink') {
      await fs.ensureSymlink(localPath, targetPath);
    } else {
      await fs.copy(localPath, targetPath);
    }
  }

  // 4. 更新 lock
  return createSkillEntry(metadata, { type: 'local', path: localPath });
}
```

#### D. 配置文件导入

**用途:**
- 团队共享配置
- 换机快速恢复
- 备份还原

**支持的格式:**
```yaml
# skills-lock.yaml (完整)
version: 1
skills:
  pr-review:
    source: github:vercel-labs/skills-tree
    skillPath: review/pr-review
    agents: [claude-code, cursor]
    
  frontend-design:
    source: github:acme-corp/skills
    agents: [cursor]
```

```txt
# skills.txt (简易)
github:vercel-labs/skills-tree/pr-review
github:acme-corp/skills/frontend-design
```

**导入流程:**
```typescript
async function importFromFile(filePath: string): Promise<ImportResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // 检测格式
  const format = detectFormat(content);
  
  const sources = format === 'yaml' 
    ? parseYaml(content).skills
    : parseTextList(content);

  // 批量安装
  const results = await Promise.allSettled(
    sources.map(source => installSkill(source))
  );

  return {
    total: sources.length,
    success: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    errors: results
      .map((r, i) => r.status === 'rejected' ? { source: sources[i], error: r.reason } : null)
      .filter(Boolean),
  };
}
```

### 7.3 用户分层设计

| 用户类型 | 主要方式 | 备选方式 | 特点 |
|---------|---------|---------|------|
| **新手** | 发现页面浏览 | 一键安装链接 | 图形化、有推荐 |
| **普通用户** | 发现页面搜索 | GitHub URL | 知道要找什么 |
| **高级用户** | GitHub URL 直接装 | 本地导入 | 熟悉生态 |
| **开发者** | 本地 Symlink | 自己写 SKILL.md | 需要实时更新 |
| **团队用户** | 配置文件导入 | 私有 Registry | 共享配置 |

### 7.4 实现优先级

**P0 - MVP 必须:**
1. ✅ GitHub URL 安装（支持 shorthand）
2. ✅ 本地目录导入

**P1 - 体验提升:**
3. 发现页面基础版（GitHub API 搜索）
4. 快捷语法提示（user/repo@skill）

**P2 - 进阶功能:**
5. 官方精选列表集成
6. 配置文件导入/导出
7. 一键安装链接协议
8. 团队共享功能

### 7.5 错误处理

| 错误场景 | 提示信息 | 解决方案 |
|---------|---------|---------|
| 无效的 GitHub URL | "无法识别该来源，请检查 URL 格式" | 显示格式示例 |
| 仓库不存在 | "该仓库不存在或没有访问权限" | 检查拼写、权限 |
| 找不到 SKILL.md | "该仓库中没有找到有效的 SKILL.md" | 建议正确的目录结构 |
| 网络错误 | "无法连接到 GitHub，请检查网络" | 重试按钮、离线提示 |
| 已存在同名 Skill | "该 Skill 已安装，是否覆盖？" | 覆盖/取消选项 |

---

## 8. 变更历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 0.1.0 | 2026-03-01 | 依赖 CLI 版本 |
| 0.2.0 | 2026-03-01 | 完全自研架构，添加 Skill 获取策略 |
