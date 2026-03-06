# Contributing to Skills Manager

感谢您对 Skills Manager 项目的关注！我们欢迎所有形式的贡献。

## 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议，请通过 GitHub Issues 提交：

1. 使用清晰的标题描述问题
2. 描述复现步骤（如果是 bug）
3. 说明期望行为与实际行为
4. 提供系统环境信息（操作系统、Node 版本等）

### 提交代码

1. **Fork** 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的改动 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 **Pull Request**

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/your-username/skills-manager.git
cd skills-manager

# 安装依赖
make install

# 启动开发服务器
make dev
```

### 代码规范

- 遵循现有的代码风格
- 运行 `make check` 确保代码通过检查
- 添加必要的测试覆盖新功能
- 更新相关文档

### 提交信息规范

请使用清晰的提交信息：

- `feat:` 新功能
- `fix:` 修复问题
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具相关

示例：

```
feat: 添加 MCP Server 自动发现功能

- 实现 GitHub 搜索 API 集成
- 添加结果缓存机制
- 更新 UI 展示发现结果
```

## 开发指南

详见 [skills-docs/05-development/DEV-GUIDE.md](./skills-docs/05-development/DEV-GUIDE.md)

## 行为准则

参与本项目即表示您同意遵守我们的 [行为准则](./CODE_OF_CONDUCT.md)。

## 许可证

通过贡献代码，您同意您的贡献将在 [MIT 许可证](./LICENSE) 下发布。
