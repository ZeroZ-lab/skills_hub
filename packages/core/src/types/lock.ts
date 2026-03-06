import type { AgentType } from './agent';

/** Global lock file structure */
export interface GlobalLockFile {
  version: 3;
  skills: Record<string, GlobalLockEntry>;
}

/** Global lock agent install entry */
export interface GlobalAgentInstallEntry {
  agent: AgentType;
  scope: 'global' | 'project';
  mode: 'symlink' | 'copy';
  installedPath: string;
  installedAt: string;
}

/** Global lock entry */
export interface GlobalLockEntry {
  source: string;
  subpath?: string;
  treeSha: string;
  installs: GlobalAgentInstallEntry[];
}

/** Project lock file structure */
export interface ProjectLockFile {
  version: 1;
  skills: Record<string, ProjectLockEntry>;
}

/** Project lock agent install entry */
export interface ProjectAgentInstallEntry {
  agent: AgentType;
  scope: 'global' | 'project';
  mode: 'symlink' | 'copy';
  installedPath: string;
  installedAt: string;
}

/** Project lock entry */
export interface ProjectLockEntry {
  source: string;
  subpath?: string;
  contentHash: string;
  installs: ProjectAgentInstallEntry[];
}
