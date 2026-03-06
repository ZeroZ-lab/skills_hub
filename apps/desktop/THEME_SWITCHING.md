# 主题切换功能完成 🎨

## 已完成的工作

### 1. 创建主题管理 Hook
**文件**: `src/hooks/useTheme.ts`

功能:
- 支持三种主题模式: `system` / `light` / `dark`
- 自动应用主题到 `<html>` 根元素
- 监听系统主题变化(当选择 system 模式时)
- 与 Settings store 集成

### 2. 更新 CSS 变量
**文件**: `src/index.css`

添加了完整的浅色/深色主题变量:
- `:root` - 浅色主题(默认)
- `.dark` - 深色主题
- 所有 shadcn/ui 颜色变量都有对应的浅色/深色版本

### 3. 集成到应用
**文件**: `src/App.tsx`

在应用根组件调用 `useTheme()` hook,自动应用主题。

### 4. Settings 页面
**文件**: `src/pages/Settings.tsx`

主题选择器已存在,支持三个选项:
- 🌐 系统 (System) - 跟随系统设置
- ☀️ 浅色 (Light) - 白色模式
- 🌙 深色 (Dark) - 暗黑模式

### 5. 更新默认配置
**Rust**: `src-tauri/src/config/app_config.rs`
**TypeScript**: `src/stores/settings.ts`

默认主题改为 `"system"`,自动跟随系统设置。

## 技术实现

### Tailwind Dark Mode
```js
// tailwind.config.js
darkMode: ['class']  // 使用 class 策略
```

### 主题切换逻辑
```typescript
// 根据配置应用主题类
if (theme === 'system') {
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark' : 'light';
  root.classList.add(systemTheme);
} else {
  root.classList.add(theme);
}
```

### 系统主题监听
```typescript
// 监听系统主题变化
mediaQuery.addEventListener('change', (e) => {
  root.classList.remove('light', 'dark');
  root.classList.add(e.matches ? 'dark' : 'light');
});
```

## 使用方式

### 在 Settings 页面切换主题
1. 打开 Settings 页面
2. 找到 "Appearance" 部分
3. 在 "Theme" 下拉菜单选择:
   - System - 跟随系统
   - Light - 浅色模式
   - Dark - 深色模式
4. 点击 Save 保存

### 在代码中使用主题
```typescript
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme('dark')}>
      Current: {theme}
    </button>
  );
}
```

## 构建结果

✅ TypeScript 编译通过
✅ Rust 编译通过
✅ Vite 生产构建成功

## 启动应用测试

```bash
cd apps/desktop && pnpm tauri dev
```

测试步骤:
1. 打开应用(默认跟随系统主题)
2. 进入 Settings → Appearance
3. 切换主题查看效果
4. 切换到 System 模式,然后在系统设置中切换浅色/深色,应用会自动跟随

## 主题颜色

### 浅色主题
- 背景: 白色 (#FFFFFF)
- 前景: 深灰色
- 卡片: 白色
- 边框: 浅灰色
- Primary: 靛蓝色 (保持一致)

### 深色主题
- 背景: 近黑色 (#0a0a14)
- 前景: 浅白色
- 卡片: 深灰色
- 边框: 深灰色
- Primary: 靛蓝色 (保持一致)

所有 UI 组件都会自动适配当前主题! 🎉
