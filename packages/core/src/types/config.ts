/** Application configuration */
export interface AppConfig {
  defaultMode: 'symlink' | 'copy';
  defaultScope: 'global' | 'project';
  updateInterval: number;
  cacheTTL: number;
  githubToken?: string;
  theme: 'dark' | 'light';
  proxy?: string;
  customAgentRegistry?: string;
  sourceAliases: Record<string, string>;
}

/** Command error from Rust backend */
export interface CommandError {
  code: string;
  message: string;
  details?: string;
}

/** Import result */
export interface ImportResult {
  skillsImported: number;
  mcpImported: number;
  pendingSecrets: PendingMCPSecretInput[];
  errors: string[];
}

/** Pending MCP secret input after import */
export interface PendingMCPSecretInput {
  serverName: string;
  fields: string[];
}

/** Log result */
export interface LogResult {
  logs: LogEntry[];
  total: number;
}

/** Log entry */
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  details?: string;
}

/** Deep link action */
export interface DeepLinkAction {
  type: 'install';
  source: string;
  resolvedSkills: import('./provider').ResolvedSkill[];
}
