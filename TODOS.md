# TODOS

## High Priority

### FR-TODO-001: 修复 AgentMCPPanel — Rust 侧 agent-specific MCP commands 不存在

**What:** 在 Rust 侧实现 agent-specific MCP 管理命令，或将前端 store 改回使用现有 server-centric API。

**Why:** `stores/mcp.ts` 中的所有 per-agent MCP 操作（fetchAgentServers, addAgentServer, removeAgentServer, toggleAgentServer 等）调用的 Rust commands（`list_agent_mcp_servers`, `add_agent_mcp_server`, `update_agent_mcp_server`, `remove_agent_mcp_server`, `toggle_agent_mcp_server`）在 `commands/mcp.rs` 中均不存在。Agent 详情页的 MCP tab 目前完全无效——所有操作会静默失败。

**Pros:** 修复后 Agent 详情页 MCP 管理恢复正常，与 Library 全局视图形成完整的 MCP 管理工作流。

**Cons:** 需要在 Rust 侧新增 5 个 commands 并重新设计 per-agent MCP 的数据存储模型，或重构前端 store 回到 server-centric 模型。工作量 M。

**Context:** commit `ba4bd88 Refactor MCP configuration management to be agent-specific` 重构了前端 store 使用 agent-specific 语义，但对应的 Rust commands 从未实现。现有 `list_mcp_servers(agent: Option<String>)` 是 server-centric 的（返回 MCP servers 及其所绑定的 agents）。两套模型之间存在阻抗不匹配。

**Depends on / blocked by:** 无前置条件，但建议在 Library 全局视图（本次 PR）合并后立即开始，因为全局视图用的是有效的 `list_mcp_servers(agent: None)` 路径。

**Suggested approach:**
- Option A（推荐）: 将 `stores/mcp.ts` 的 per-agent 操作改回调用现有的 server-centric commands（`add_mcp_server`, `remove_mcp_server`, `toggle_mcp_agent`）。前端用 agent type 做 filter 即可。代码量小，不需要改 Rust。
- Option B: 在 Rust 侧实现真正的 per-agent commands，重构数据模型。更干净但工作量更大。
