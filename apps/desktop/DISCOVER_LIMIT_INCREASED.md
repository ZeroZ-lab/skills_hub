# Discover Skills 限制增加 ✅

## 问题
之前 discover 页面只显示 20 个 skills，用户希望看到更多。

## 修改内容

### 1. 后端修改

**`src-tauri/src/commands/discover.rs`**
- 添加可选的 `limit` 参数
- 默认值从 20 增加到 100

```rust
pub async fn discover_skills(query: String, limit: Option<u32>) -> Result<Vec<DiscoveredSkill>, String> {
    let limit = limit.unwrap_or(100);
    // ...
}
```

**`src-tauri/src/services/discover.rs`**
- `get_featured_skills()` 的限制从 20 增加到 100

```rust
pub async fn get_featured_skills() -> Result<Vec<DiscoveredSkill>, String> {
    search_skills("ai", 100).await
}
```

### 2. 前端修改

**`src/stores/discover.ts`**
- 搜索时传递 `limit: 100` 参数

```typescript
const results = await invoke<DiscoveredSkill[]>('discover_skills', {
  query,
  limit: 100
});
```

## API 测试

```bash
curl -s "https://skills.sh/api/search?q=ai&limit=100" | jq '.count'
# 返回: 100
```

skills.sh API 支持最多 100 个结果。

## 效果

- ✅ Featured 页面显示最多 100 个热门 skills
- ✅ 搜索结果显示最多 100 个匹配的 skills
- ✅ 更好的发现体验

## 未来优化建议

1. **无限滚动/分页** - 如果需要超过 100 个结果
2. **虚拟滚动** - 优化大列表渲染性能
3. **缓存** - 减少重复 API 调用
4. **用户可配置限制** - 在设置中允许用户自定义每页数量
