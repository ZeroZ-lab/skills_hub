import type { AgentType } from './agent';

/**
 * MCP Server configuration (Agent-specific)
 * MCP 配置直接属于 Agent，无全局注册表
 */
export interface AgentMCPServer {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  enabled: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'error';
  config: MCPServerConfig;
  createdAt: string;
  updatedAt: string;
}

/** MCP Server config union type */
export type MCPServerConfig =
  | MCPStdioConfig
  | MCPSSEConfig
  | MCPHTTPConfig;

export interface MCPStdioConfig {
  type: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface MCPSSEConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

export interface MCPHTTPConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
}

/**
 * Agent and its MCP servers (for frontend display)
 * 用于前端展示的 Agent 及其 MCP 配置列表
 */
export interface AgentMCPList {
  agent: AgentType;
  agentDisplayName: string;
  configPath: string;
  format: 'json' | 'toml' | 'yaml';
  servers: AgentMCPServer[];
}

/** MCP format mapping */
export interface MCPFormatMapping {
  agent: AgentType;
  format: 'json' | 'toml' | 'yaml';
  configPath: string;
  configKey: string;
}

/** Input for adding/updating MCP server */
export interface MCPServerInput {
  name: string;
  type: 'stdio' | 'sse' | 'http';
  config: MCPServerConfig;
  enabled?: boolean;
}

// Legacy types (kept for backward compatibility during migration)
// These will be removed after full migration

/** @deprecated Use AgentMCPServer instead */
export interface MCPServer {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  enabled: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'error';
  config: MCPServerConfig;
  agents: MCPAgentBinding[];
  createdAt: string;
  updatedAt: string;
}

/** @deprecated No longer needed - MCP is directly tied to Agent */
export interface MCPAgentBinding {
  agent: AgentType;
  enabled: boolean;
  configPath: string;
  format: 'json' | 'toml' | 'yaml';
  syncStatus: 'pending' | 'synced' | 'error';
  lastSyncedAt?: string;
  lastError?: string;
}

/** @deprecated No longer needed - no global registry */
export interface MCPRegistryBinding {
  agent: AgentType;
  enabled: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
  lastSyncedAt?: string;
  lastError?: string;
}

/** @deprecated Use direct agent parameter instead */
export interface MCPAgentBindingInput {
  agent: AgentType;
  enabled: boolean;
}

/** @deprecated No global registry anymore */
export interface MCPRegistryServer {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  config: MCPServerConfig;
  agents: MCPRegistryBinding[];
  createdAt: string;
  updatedAt: string;
}

/** @deprecated No global registry anymore */
export interface MCPRegistryFile {
  version: 1;
  servers: Record<string, MCPRegistryServer>;
}
