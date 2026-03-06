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
  // CLI Agents
  'claude-code': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  claude: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  aider: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'open-interpreter': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',

  // IDE Agents
  cursor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  windsurf: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  copilot: 'bg-green-500/20 text-green-400 border-green-500/30',
  'github-copilot': 'bg-green-500/20 text-green-400 border-green-500/30',
  codex: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  continue: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  cline: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  supermaven: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  tabnine: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  codeium: 'bg-sky-500/20 text-sky-400 border-sky-500/30',

  // Web Agents
  'cherry-studio': 'bg-red-500/20 text-red-400 border-red-500/30',
  'chat-nio': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'lobe-chat': 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  'next-chat': 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  chatbox: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',

  // Desktop Agents
  jan: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  msty: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',

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
    // CLI Agents
    'claude-code': 'Claude Code',
    claude: 'Claude Code',
    aider: 'Aider',
    'open-interpreter': 'Open Interpreter',

    // IDE Agents
    cursor: 'Cursor',
    windsurf: 'Windsurf',
    copilot: 'GitHub Copilot',
    'github-copilot': 'GitHub Copilot',
    codex: 'Codex',
    continue: 'Continue',
    cline: 'Cline',
    supermaven: 'Supermaven',
    tabnine: 'Tabnine',
    codeium: 'Codeium',

    // Web Agents
    'cherry-studio': 'Cherry Studio',
    'chat-nio': 'Chat Nio',
    'lobe-chat': 'Lobe Chat',
    'next-chat': 'Next Chat',
    chatbox: 'Chatbox',

    // Desktop Agents
    jan: 'Jan',
    msty: 'Msty',

    // Special: Universal meta-agent - will be translated in component
    universal: 'Universal',
  };
  return names[agentType.toLowerCase()] || agentType;
}

// Check if an agent is a universal agent (uses .agents/skills directory)
export function isUniversalAgent(agentType: string): boolean {
  const universalAgents = [
    'amp',
    'codex',
    'cline',
    'cursor',
    'gemini-cli',
    'github-copilot',
    'kimi-cli',
    'opencode',
    'replit',
    'zed',
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
