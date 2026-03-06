import type { AgentType } from './agent';

/** MCP Server configuration */
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

/** MCP Server to Agent binding */
export interface MCPAgentBinding {
  agent: AgentType;
  enabled: boolean;
  configPath: string;
  format: 'json' | 'toml' | 'yaml';
  syncStatus: 'pending' | 'synced' | 'error';
  lastSyncedAt?: string;
  lastError?: string;
}

/** MCP registry persisted binding */
export interface MCPRegistryBinding {
  agent: AgentType;
  enabled: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
  lastSyncedAt?: string;
  lastError?: string;
}

/** Frontend MCP binding input */
export interface MCPAgentBindingInput {
  agent: AgentType;
  enabled: boolean;
}

/** MCP registry persisted server entry */
export interface MCPRegistryServer {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  config: MCPServerConfig;
  agents: MCPRegistryBinding[];
  createdAt: string;
  updatedAt: string;
}

/** MCP registry file (SSOT) */
export interface MCPRegistryFile {
  version: 1;
  servers: Record<string, MCPRegistryServer>;
}

/** MCP format mapping */
export interface MCPFormatMapping {
  agent: AgentType;
  format: 'json' | 'toml' | 'yaml';
  configPath: string;
  configKey: string;
}
