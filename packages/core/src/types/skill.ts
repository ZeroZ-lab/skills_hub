import type { AgentType } from './agent';

/** Single Agent install record (each Agent has independent scope and mode) */
export interface AgentInstallRecord {
  agent: AgentType;
  scope: 'global' | 'project';
  mode: 'symlink' | 'copy';
  installedPath: string;
  installedAt: string;
}

/** Installed Skill info */
export interface Skill {
  id: string;
  name: string;
  description: string;
  source: Source;
  canonicalPath: string;
  version?: string;
  author?: string;
  tags: string[];
  installs: AgentInstallRecord[];
  updatedAt: string;
  treeSha?: string;
  contentHash: string;
  metadata?: SkillMetadata;
}

/** Skill metadata from SKILL.md frontmatter */
export interface SkillMetadata {
  internal?: boolean;
  [key: string]: unknown;
}

/** Skill source info */
export interface Source {
  type: 'github' | 'gitlab' | 'git' | 'local' | 'zip' | 'well-known' | 'npm';
  url: string;
  subpath?: string;
  ref?: string;
  provider?: string;
}

/** Parsed source info */
export interface ParsedSource {
  type: Source['type'];
  owner?: string;
  repo?: string;
  url: string;
  subpath?: string;
  ref?: string;
  skillName?: string;
}

/** Install options */
export interface InstallOptions {
  agents: AgentType[];
  mode: 'symlink' | 'copy';
  scope: 'global' | 'project';
  agentBindings?: Partial<Record<AgentType, {
    scope?: 'global' | 'project';
    mode?: 'symlink' | 'copy';
  }>>;
  ref?: string;
  subpath?: string;
  force?: boolean;
}

/** Skill detail with full content */
export interface SkillDetail extends Skill {
  readmeContent: string;
  fileList: string[];
  sourceUrl?: string;
}
