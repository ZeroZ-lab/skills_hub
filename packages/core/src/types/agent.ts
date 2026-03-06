/** Supported Agent type identifiers */
export type AgentType =
  | 'amp'
  | 'augment'
  | 'claude-code'
  | 'openclaw'
  | 'cline'
  | 'codebuddy'
  | 'codex'
  | 'command-code'
  | 'continue'
  | 'cortex'
  | 'crush'
  | 'cursor'
  | 'droid'
  | 'gemini-cli'
  | 'github-copilot'
  | 'goose'
  | 'iflow-cli'
  | 'junie'
  | 'kilo'
  | 'kimi-cli'
  | 'kiro-cli'
  | 'kode'
  | 'mcpjam'
  | 'mistral-vibe'
  | 'mux'
  | 'neovate'
  | 'opencode'
  | 'openhands'
  | 'pi'
  | 'pochi'
  | 'adal'
  | 'qoder'
  | 'qwen-code'
  | 'replit'
  | 'roo'
  | 'trae'
  | 'trae-cn'
  | 'windsurf'
  | 'zencoder'
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
