import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface AgentConfig {
  type: string;
  displayName: string;
  description: string | null;
  category: string;
  skillsDir: string;
  globalSkillsDir: string;
  detectCommand: string | null;
  detectPaths: string[] | null;
  supportsMcp: boolean;
  mcpConfig?: {
    format: 'json' | 'toml' | 'yaml';
    configPath: string;
    configKey: string;
  };
}

export interface AgentStatus {
  config: AgentConfig;
  installed: boolean;
  isOnline: boolean;
  skillCount: number;
  mcpCount: number;
}

// ─── Agent color/icon helpers ───────────────────────────────────────────────

export const AGENT_COLORS: Record<string, string> = {
  'claude-code': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  codex: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'gemini-cli': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  openclaw: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  opencode: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',

  // Special: Universal meta-agent
  universal:
    'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',

  // Default fallback
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function getAgentColor(agentType: string): string {
  return AGENT_COLORS[agentType.toLowerCase()] || AGENT_COLORS.default;
}

export function getAgentDisplayName(agentType: string): string {
  const names: Record<string, string> = {
    'claude-code': 'Claude Code',
    codex: 'Codex',
    'gemini-cli': 'Gemini CLI',
    openclaw: 'OpenClaw',
    opencode: 'OpenCode',

    // Special: Universal meta-agent - will be translated in component
    universal: 'Universal',
  };
  return names[agentType.toLowerCase()] || agentType;
}

// Check if an agent is a universal agent (uses .agents/skills directory)
export function isUniversalAgent(agentType: string): boolean {
  const universalAgents = [
    'codex',
    'gemini-cli',
    'opencode',
    'universal',
    'global', // legacy: old installs recorded as "global"
  ];
  return universalAgents.includes(agentType.toLowerCase());
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface AgentsState {
  agents: AgentStatus[];
  isLoading: boolean;
  isDetecting: boolean;
  error: string | null;
  filter: string;
  searchQuery: string;
  fetchAgents: () => Promise<void>;
  detectAgents: () => Promise<void>;
  setFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useAgentsStore = create<AgentsState>((set) => ({
  agents: [],
  isLoading: false,
  isDetecting: false,
  error: null,
  filter: 'all',
  searchQuery: '',
  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const agents = await invoke<AgentStatus[]>('list_agents');
      set({ agents, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },
  detectAgents: async () => {
    set({ isDetecting: true, error: null });
    try {
      const agents = await invoke<AgentStatus[]>('detect_agents');
      set({ agents, isDetecting: false });
    } catch (err) {
      set({ error: String(err), isDetecting: false });
    }
  },
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
