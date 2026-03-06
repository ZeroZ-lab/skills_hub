import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useAgentsStore } from './agents';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MCPAgentBinding {
  agent: string;
  enabled: boolean;
  configPath: string;
  format: string;
  syncStatus: string; // "pending" | "synced" | "error"
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface MCPServer {
  id: string;
  name: string;
  type: string; // "stdio" | "sse" | "streamable-http"
  enabled: boolean;
  connectionStatus: string | null;
  config: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
  };
  agents: MCPAgentBinding[];
  createdAt: string;
  updatedAt: string;
}

export interface MCPAgentBindingInput {
  agent: string;
  enabled: boolean;
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface MCPState {
  // Data
  servers: MCPServer[];
  isLoading: boolean;
  error: string | null;

  // Filters
  selectedAgent: string;
  searchQuery: string;

  // Modals
  addModalOpen: boolean;
  editingServer: MCPServer | null;
  importModalOpen: boolean;
  isImporting: boolean;

  // Actions
  fetchServers: () => Promise<void>;
  addServer: (
    name: string,
    serverType: string,
    config: Record<string, unknown>,
    agents: MCPAgentBindingInput[]
  ) => Promise<MCPServer | null>;
  updateServer: (
    id: string,
    updates: {
      name?: string;
      config?: Record<string, unknown>;
      agents?: MCPAgentBindingInput[];
    }
  ) => Promise<MCPServer | null>;
  removeServer: (id: string) => Promise<void>;
  toggleAgent: (serverId: string, agent: string, enabled: boolean) => Promise<void>;
  importFromAgent: (agent: string) => Promise<MCPServer[]>;

  // Setters
  setSelectedAgent: (agent: string) => void;
  setSearchQuery: (query: string) => void;
  setAddModalOpen: (open: boolean) => void;
  setEditingServer: (server: MCPServer | null) => void;
  setImportModalOpen: (open: boolean) => void;
}

export const useMCPStore = create<MCPState>((set, get) => ({
  // Data
  servers: [],
  isLoading: false,
  error: null,

  // Filters
  selectedAgent: 'all',
  searchQuery: '',

  // Modals
  addModalOpen: false,
  editingServer: null,
  importModalOpen: false,
  isImporting: false,

  // ─── Actions ────────────────────────────────────────────────────────

  fetchServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const servers = await invoke<MCPServer[]>('list_mcp_servers');
      set({ servers, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  addServer: async (name, serverType, config, agents) => {
    set({ isLoading: true, error: null });
    try {
      const server = await invoke<MCPServer>('add_mcp_server', {
        name,
        serverType,
        config,
        agents,
      });
      await get().fetchServers();
      await useAgentsStore.getState().fetchAgents();
      set({ addModalOpen: false });
      return server;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      return null;
    }
  },

  updateServer: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const server = await invoke<MCPServer>('update_mcp_server', {
        id,
        ...updates,
      });
      await get().fetchServers();
      await useAgentsStore.getState().fetchAgents();
      set({ editingServer: null });
      return server;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      return null;
    }
  },

  removeServer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('remove_mcp_server', { id });
      await get().fetchServers();
      await useAgentsStore.getState().fetchAgents();
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  toggleAgent: async (serverId, agent, enabled) => {
    try {
      await invoke('toggle_mcp_agent', { serverId, agent, enabled });
      await get().fetchServers();
      await useAgentsStore.getState().fetchAgents();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  importFromAgent: async (agent) => {
    set({ isImporting: true, error: null });
    try {
      const servers = await invoke<MCPServer[]>('import_mcp_from_agent', { agent });
      await get().fetchServers();
      await useAgentsStore.getState().fetchAgents();
      set({ isImporting: false });
      return servers;
    } catch (err) {
      set({ error: String(err), isImporting: false });
      throw err;
    }
  },

  // ─── Setters ────────────────────────────────────────────────────────

  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAddModalOpen: (open) =>
    set({
      addModalOpen: open,
      ...(open ? {} : { editingServer: null, error: null }),
    }),
  setEditingServer: (server) =>
    set({
      editingServer: server,
      addModalOpen: server !== null,
    }),
  setImportModalOpen: (open) =>
    set({
      importModalOpen: open,
      ...(open ? {} : { isImporting: false, error: null }),
    }),
}));
