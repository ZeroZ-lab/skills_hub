# Skills Manager 文档中心

`skills-docs/` 是当前仓库的正式文档目录，用来承载项目概览、需求、架构、接口和开发指南。

如果你是第一次进入仓库，建议先读根目录 [README.md](../README.md)，再回到这里按主题深入。

## 文档使用原则

- 根目录 `README.md`：对外项目入口，面向使用者和贡献者
- `skills-docs/`：正式项目文档，面向研发、维护者和长期演进
- `apps/desktop/*.md`：阶段性实现说明、专题记录或历史笔记，不作为统一入口

如果文档和代码出现冲突，以当前代码行为为准，再回头修正文档。

## 推荐阅读路径

### 面向首次了解项目的人

1. [项目概览](./00-overview/PROJECT-OVERVIEW.md)
2. [术语表](./00-overview/GLOSSARY.md)
3. [开发指南](./05-development/DEV-GUIDE.md)

### 面向准备参与开发的人

1. [开发指南](./05-development/DEV-GUIDE.md)
2. [系统设计](./02-architecture/SYSTEM-DESIGN.md)
3. [Tauri Commands](./04-api/TAURI-COMMANDS.md)
4. [安全审计](./02-architecture/SECURITY-AUDIT.md)

### 面向产品 / 设计协作

1. [PRD](./01-requirements/PRD.md)
2. [UI 设计规范](./03-design/UI-DESIGN-SPEC.md)
3. [变更历史](./00-overview/CHANGELOG.md)

## 文档索引

| 分类 | 文档 | 路径 | 说明 |
| --- | --- | --- | --- |
| 概览 | 项目概览 | [00-overview/PROJECT-OVERVIEW.md](./00-overview/PROJECT-OVERVIEW.md) | 项目定位、目标用户、价值主张 |
| 概览 | 术语表 | [00-overview/GLOSSARY.md](./00-overview/GLOSSARY.md) | 统一核心概念 |
| 概览 | 变更历史 | [00-overview/CHANGELOG.md](./00-overview/CHANGELOG.md) | 文档级变更记录 |
| 需求 | 产品需求文档 | [01-requirements/PRD.md](./01-requirements/PRD.md) | 功能与非功能需求 |
| 架构 | 系统设计 | [02-architecture/SYSTEM-DESIGN.md](./02-architecture/SYSTEM-DESIGN.md) | 前后端架构、数据模型、技术选型 |
| 架构 | Agent Registry 规范 | [02-architecture/AGENT-REGISTRY-SPEC.md](./02-architecture/AGENT-REGISTRY-SPEC.md) | Agent 注册表与目录约定 |
| 架构 | 安全审计 | [02-architecture/SECURITY-AUDIT.md](./02-architecture/SECURITY-AUDIT.md) | 风险模型与安全策略 |
| 设计 | UI 设计规范 | [03-design/UI-DESIGN-SPEC.md](./03-design/UI-DESIGN-SPEC.md) | 页面和组件设计规范 |
| 接口 | Tauri Commands | [04-api/TAURI-COMMANDS.md](./04-api/TAURI-COMMANDS.md) | 前后端调用边界 |
| 开发 | 开发指南 | [05-development/DEV-GUIDE.md](./05-development/DEV-GUIDE.md) | 环境准备、结构说明、开发流程 |

## 历史与专题文档

下面这些文档仍有参考价值，但更偏实现过程记录，不建议作为项目入口：

### `apps/desktop/`

- [IMPORT_GUIDE.md](../apps/desktop/IMPORT_GUIDE.md)
- [SKILLS_IMPORT_GUIDE.md](../apps/desktop/SKILLS_IMPORT_GUIDE.md)
- [THEME_SWITCHING.md](../apps/desktop/THEME_SWITCHING.md)
- [DISCOVER_IMPLEMENTATION.md](../apps/desktop/DISCOVER_IMPLEMENTATION.md)
- [LOBE_ICONS_INTEGRATION.md](../apps/desktop/LOBE_ICONS_INTEGRATION.md)

### 旧版或补充设计稿

- [DESIGN.md](./DESIGN.md)
- [UI_DESIGN.md](./UI_DESIGN.md)
- [REQUIREMENTS.md](./REQUIREMENTS.md)

这些文件可以作为背景材料，但不应替代当前的正式文档链路。

## 文档维护建议

- 新增模块时，优先补充对应的正式文档，而不是继续新增零散说明文件
- 页面级实现细节，优先写进正式设计文档或开发指南
- 临时排障笔记可以放在实现目录，但后续应收敛回 `skills-docs/`

## 当前状态

当前文档体系已经覆盖：

- 项目定位
- 产品需求
- 系统架构
- UI 设计
- Tauri 接口
- 开发环境与流程

但仍有两个现实情况需要注意：

- 部分文档仍带有“草案”属性，描述会早于代码实现
- 仓库命名 `Skills Manager` 与桌面产物名 `Skills Hub` 尚未完全统一
