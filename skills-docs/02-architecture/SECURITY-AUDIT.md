# 安全审计规范 (Security Audit Spec)

**文档编号**: SM-ARCH-003
**版本**: 0.3.0

---

## 1. 概述

安全审计旨在安装 Skill 前向用户告知其潜在风险。Skills Manager 不会阻止安装（除非致命格式错误），但会提供显著的评级。

## 2. 评级算法 (Rating Algorithm)

审计得分通过以下 4 个维度进行加权计算：

### 2.1 来源可信度 (Source Reputation - 40%)
| 来源 | 分数 |
|------|------|
| GitHub 认证作者 / skills.sh 认证 | 100 |
| GitHub Star > 500 | 90 |
| GitHub Star 100-500 | 70 |
| 本地安装 / ZIP 导入 | 50 |
| 新建 GitHub 仓库 (< 30 天) | 30 |

### 2.2 敏感关键词检测 (SAST - 40%)
静态扫描 `SKILL.md` 和关联指令文件，查找以下关键词：
- **网络相关**: `fetch`, `curl`, `wget`, `http`
- **文件与执行**: `chmod`, `exec`, `spawn`, `rm`, `sudo`, `mv`
- **环境变量**: `process.env`, `eval`, `PATH`

**评级策略**:
- 发现 0 个关键词: **Safe (100)**
- 发现 1-2 个关键词: **Caution (60)**
- 发现 3 个以上关键词: **Warning (30)**

### 2.3 来源协议 (Protocol - 10%)
- HTTPS: 100
- Well-Known / ZIP: 80
- HTTP: 0 (严重警告)

### 2.4 历史举报 (Community - 10%)
- 来自 `skills.sh` 社区的反馈。

---

## 3. 评级定义 (Outcome)

| 评级 | 分数区间 | UI 展示 | 用户操作要求 |
|------|---------|---------|-------------|
| **Safe** | 90-100 | 绿色 Shield | 直接安装 |
| **Caution** | 60-89 | 黄色 Triangle | 显示敏感项，需点击确认 |
| **Warning** | < 60 | 红色 Circle | 强制 3s 倒计时 + 手动输入确认 |

---

## 4. 实施流程

1. **Fetch**: 将 Skill 下载到临时缓存目录。
2. **Scan**: 使用 Rust 高性能 `grep` 实现进行关键词全文检索。
3. **Parse**: 解析 `SKILL.md` frontmatter，识别作者信息。
4. **Display**: 在 `DeepLinkLanding` 或 `InstallModal` 展示审计卡片。
