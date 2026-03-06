import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SkillSource {
  type: 'github' | 'local' | 'url';
  url: string;
  subpath?: string;
  ref?: string;
  provider?: string;
}

export interface AgentInstallRecord {
  agent: string;
  scope: 'global' | 'project';
  mode: 'symlink' | 'copy';
  installedPath: string;
  installedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  source: SkillSource;
  canonicalPath: string;
  version: string;
  author: string;
  tags: string[];
  installs: AgentInstallRecord[];
  updatedAt: string;
  treeSha: string;
  contentHash: string;
}

export interface SkillDetail extends Skill {
  readmeContent: string;
  fileList: string[];
  sourceUrl: string;
}

export interface ResolvedSkill {
  name: string;
  description: string;
  source: SkillSource;
  version?: string;
  author?: string;
  tags?: string[];
}

export interface UpdateCheckResult {
  name: string;
  currentHash: string;
  latestHash: string;
  hasUpdate: boolean;
  currentVersion?: string;
  latestVersion?: string;
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface SkillsState {
  // Data
  skills: Skill[];
  isLoading: boolean;
  error: string | null;

  // Filters
  selectedAgent: string;
  searchQuery: string;

  // Install modal
  installModalOpen: boolean;
  installSource: string;
  isInstalling: boolean;
  resolvedSkills: ResolvedSkill[];
  isResolving: boolean;
  resolveError: string | null;
  installError: string | null;

  // Update checks
  updateResults: UpdateCheckResult[];
  isCheckingUpdates: boolean;

  // Actions
  fetchSkills: () => Promise<void>;
  installSkill: (
    source: string,
    agents: string[],
    mode: string,
    scope: string,
    force?: boolean,
    agentBindings?: Record<string, unknown>
  ) => Promise<Skill | null>;
  removeSkill: (name: string, agents?: string[], cleanCache?: boolean) => Promise<void>;
  updateSkill: (name: string) => Promise<Skill | null>;
  checkUpdates: () => Promise<void>;
  resolveSource: (source: string) => Promise<void>;

  // Setters
  setSelectedAgent: (agent: string) => void;
  setSearchQuery: (query: string) => void;
  setInstallModalOpen: (open: boolean) => void;
  setInstallSource: (source: string) => void;
  clearResolvedSkills: () => void;
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  // Data
  skills: [],
  isLoading: false,
  error: null,

  // Filters
  selectedAgent: 'all',
  searchQuery: '',

  // Install modal
  installModalOpen: false,
  installSource: '',
  isInstalling: false,
  resolvedSkills: [],
  isResolving: false,
  resolveError: null,
  installError: null,

  // Update checks
  updateResults: [],
  isCheckingUpdates: false,

  // ─── Actions ────────────────────────────────────────────────────────

  fetchSkills: async () => {
    set({ isLoading: true, error: null });
    try {
      const { selectedAgent, searchQuery } = get();
      const params: Record<string, string> = {};
      if (selectedAgent !== 'all') params.agent = selectedAgent;
      // Removed scope filter - all skills are global now
      if (searchQuery.trim()) params.query = searchQuery.trim();

      const skills = await invoke<Skill[]>('list_skills', params);
      set({ skills, isLoading: false });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
      set({ error: errorMsg, isLoading: false });
    }
  },

  installSkill: async (source, agents, mode, scope, force, agentBindings) => {
    set({ isInstalling: true, installError: null });
    try {
      const params: Record<string, unknown> = { source, agents, mode, scope };
      if (force !== undefined) params.force = force;
      if (agentBindings) params.agent_bindings = agentBindings;

      const skill = await invoke<Skill>('install_skill', params);
      // Refresh the list after install
      await get().fetchSkills();
      set({ isInstalling: false });
      return skill;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
      set({ installError: errorMsg, isInstalling: false });
      return null;
    }
  },

  removeSkill: async (name, agents, cleanCache) => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, unknown> = { name };
      if (agents) params.agents = agents;
      if (cleanCache !== undefined) params.clean_cache = cleanCache;

      await invoke('remove_skill', params);
      await get().fetchSkills();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
      set({ error: errorMsg, isLoading: false });
    }
  },

  updateSkill: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const skill = await invoke<Skill>('update_skill', { name });
      await get().fetchSkills();
      // Re-check updates to refresh the update badges
      await get().checkUpdates();
      return skill;
    } catch (err) {
      const errorMsg = String(err);
      console.error('Update skill error:', errorMsg);
      set({ error: errorMsg, isLoading: false });
      return null;
    }
  },

  checkUpdates: async () => {
    set({ isCheckingUpdates: true });
    try {
      const results = await invoke<UpdateCheckResult[]>('check_updates');
      set({ updateResults: results, isCheckingUpdates: false });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
      set({ error: errorMsg, isCheckingUpdates: false });
    }
  },

  resolveSource: async (source) => {
    set({ isResolving: true, resolveError: null, resolvedSkills: [] });
    try {
      const resolved = await invoke<ResolvedSkill[]>('resolve_source', { source });
      set({ resolvedSkills: resolved, isResolving: false });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
      set({ resolveError: errorMsg, isResolving: false });
    }
  },

  // ─── Setters ────────────────────────────────────────────────────────

  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setInstallModalOpen: (open) =>
    set({
      installModalOpen: open,
      ...(open
        ? {}
        : {
            installSource: '',
            resolvedSkills: [],
            resolveError: null,
            installError: null,
            isResolving: false,
            isInstalling: false,
          }),
    }),
  setInstallSource: (source) => set({ installSource: source }),
  clearResolvedSkills: () => set({ resolvedSkills: [], resolveError: null, installError: null }),
}));
