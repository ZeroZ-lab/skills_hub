/** Supported Agent type identifiers */
export type AgentType =
  | 'claude-code'
  | 'openclaw'
  | 'codex'
  | 'gemini-cli'
  | 'opencode'
  | 'universal'
  | string;

/** Agent configuration */
export interface AgentConfig {
  type: AgentType;
  displayName: string;
  description?: string;
  category: 'universal' | 'non-universal';
  skillsDir: string;
  globalSkillsDir: string;
  detectCommand?: string;
  detectPaths?: string[];
  mcpConfig?: {
    format: 'json' | 'toml' | 'yaml';
    configPath: string;
    configKey: string;
  };
}

/** Agent detection status */
export interface AgentStatus {
  config: AgentConfig;
  installed: boolean;
  isOnline: boolean;
  skillCount: number;
  mcpCount: number;
}

/** Agent detail with associated skills and MCP servers */
export interface AgentDetail extends AgentStatus {
  skills: import('./skill').Skill[];
  mcpServers: import('./mcp').MCPServer[];
  configPaths: {
    skills: string;
    mcp?: string;
  };
}
