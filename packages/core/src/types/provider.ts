import type { Source } from './skill';

/** Provider interface */
export interface HostProvider {
  name: string;
  displayName: string;
  canHandle(source: string): boolean;
  resolve(source: string): Promise<ResolvedSkill[]>;
  fetch(resolved: ResolvedSkill, targetDir: string): Promise<void>;
  checkUpdate(skill: import('./skill').Skill): Promise<UpdateInfo | null>;
  search?(query: string, options?: SearchOptions): Promise<import('./discover').DiscoveredSkill[]>;
}

/** Resolved skill info */
export interface ResolvedSkill {
  name: string;
  description?: string;
  source: Source;
  provider: string;
}

/** Update info */
export interface UpdateInfo {
  currentHash: string;
  latestHash: string;
  changelog?: string;
}

/** Update check result */
export interface UpdateCheckResult {
  name: string;
  currentHash: string;
  latestHash: string;
  hasUpdate: boolean;
}

/** Search options */
export interface SearchOptions {
  page?: number;
  perPage?: number;
  channel?: string;
}
