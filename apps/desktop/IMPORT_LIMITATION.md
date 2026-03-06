# Skills 导入功能说明

## 当前状态

**重要提示**: 当前的 Skills 导入功能是一个**扫描和检测**工具，用于发现系统中已存在的 skills，但**不会自动将它们添加到 Skills Manager 的管理中**。

### 导入功能的作用

当前导入功能会：
- ✅ 扫描指定目录中的 skills
- ✅ 检测 SKILL.md 文件是否存在
- ✅ 统计发现的 skills 数量
- ✅ 显示扫描结果

但**不会**：
- ❌ 将 skills 添加到 lock 文件
- ❌ 在 Installed 页面显示这些 skills
- ❌ 自动管理这些 skills

### 为什么这样设计？

这是因为：

1. **已存在的 skills 可能缺少元数据**
   - 手动安装的 skills 可能没有完整的源信息
   - 无法确定它们的来源（GitHub、本地等）
   - 缺少版本信息和更新检查所需的数据

2. **避免数据不一致**
   - 直接导入可能导致 lock 文件数据不完整
   - 可能影响后续的更新和管理功能

3. **推荐使用正式安装流程**
   - 通过 Install 功能安装的 skills 有完整的元数据
   - 可以正确追踪来源、版本和更新

---

## 如何正确管理 Skills

### 方法 1: 使用 Install 功能（推荐）

如果你想在 Skills Manager 中管理 skills：

1. **打开 Installed 页面**
2. **点击 "Install Skill" 按钮**
3. **输入 skill 的源地址**，例如：
   - `vercel/skills@find-skills`
   - `https://github.com/username/repo`
   - `~/local/path/to/skill`
4. **选择要安装到的 agents**
5. **点击 Install**

这样安装的 skills 会：
- ✅ 显示在 Installed 列表中
- ✅ 可以检查更新
- ✅ 可以管理和卸载
- ✅ 有完整的元数据

### 方法 2: 从 Discover 页面安装

1. **打开 Discover 页面**
2. **搜索想要的 skill**
3. **点击 Install 按钮**
4. **选择 agents 并安装**

### 方法 3: 手动管理（不推荐）

如果你想继续手动管理 skills：
- 直接在各 agent 的 skills 目录中操作
- Skills Manager 不会追踪这些 skills
- 无法使用更新检查等功能

---

## 导入功能的实际用途

虽然导入功能不会将 skills 添加到管理中，但它仍然有用：

### 1. 发现已安装的 Skills

快速了解系统中有哪些 skills：
```
扫描结果:
- 发现: 15 个 skills
- 已在管理中: 5 个
- 未管理: 10 个
```

### 2. 审计和清理

帮助你：
- 发现重复安装的 skills
- 找到孤立的 skill 目录
- 清理不需要的 skills

### 3. 迁移参考

如果你想将手动安装的 skills 迁移到 Skills Manager：
1. 使用导入功能查看有哪些 skills
2. 记录它们的名称
3. 使用 Install 功能重新安装
4. 删除旧的手动安装版本

---

## 未来计划

### 完整的导入功能

计划在未来版本中实现：

1. **智能源检测**
   - 自动检测 skill 的 Git 仓库
   - 识别 GitHub/GitLab 源
   - 提取版本信息

2. **元数据补全**
   - 解析 SKILL.md frontmatter
   - 计算内容哈希
   - 生成完整的 lock 条目

3. **一键迁移**
   - 将手动安装的 skills 迁移到 Skills Manager
   - 保留现有的安装位置
   - 自动创建符号链接

4. **批量导入**
   - 选择要导入的 skills
   - 批量添加到管理中
   - 自动同步到 lock 文件

---

## 常见问题

### Q: 为什么导入后看不到 skills？

**A**: 当前的导入功能只是扫描工具，不会将 skills 添加到管理中。要在 Installed 页面看到 skills，需要使用 Install 功能正式安装。

### Q: 我已经手动安装了很多 skills，怎么办？

**A**: 有两个选择：
1. **继续手动管理** - Skills Manager 不会干扰它们
2. **重新安装** - 使用 Install 功能重新安装，获得完整的管理功能

### Q: 导入功能什么时候会完整实现？

**A**: 完整的导入功能需要：
- 实现源检测算法
- 添加元数据解析
- 完善 lock 文件管理

这些功能将在后续版本中逐步实现。

### Q: 我可以同时使用手动安装和 Skills Manager 吗？

**A**: 可以，但不推荐：
- 手动安装的 skills 不会被 Skills Manager 追踪
- 可能导致重复安装
- 更新管理会变得复杂

**推荐**: 选择一种方式统一管理所有 skills。

---

## 最佳实践

### 新用户

如果你是新用户：
1. ✅ 使用 Discover 页面搜索和安装 skills
2. ✅ 使用 Install 功能安装自定义 skills
3. ✅ 让 Skills Manager 管理所有 skills

### 现有用户

如果你已经手动安装了 skills：

**选项 A: 迁移到 Skills Manager**
1. 使用导入功能查看现有 skills
2. 记录需要的 skills
3. 使用 Install 功能重新安装
4. 删除旧的手动安装版本

**选项 B: 继续手动管理**
1. 保持现有的手动安装
2. 新的 skills 使用 Skills Manager 安装
3. 逐步迁移到 Skills Manager

---

## 总结

- **导入功能** = 扫描和发现工具
- **Install 功能** = 正式安装和管理
- **推荐使用 Install** 来获得完整的管理功能
- **完整的导入功能** 将在未来版本中实现

如有疑问，请查看 `IMPORT_GUIDE.md` 或提交 Issue。
