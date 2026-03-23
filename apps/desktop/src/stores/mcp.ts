import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useAgentsStore } from './agents';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * MCP Server configuration (Agent-specific)
 * MCP 配置直接属于 Agent，无全局注册表
 */
export interface AgentMCPServer {
  id: string;
  name: string;
  type: string; // "stdio" | "sse" | "http"
  enabled: boolean;
  connectionStatus: string | null;
  config: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
    method?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent and its MCP servers (for display)
 */
export interface AgentMCPConfig {
  agent: string;
  agentDisplayName: string;
  configPath: string;
  format: string;
  servers: AgentMCPServer[];
}

/**
 * Raw MCP Server shape as returned by the Rust `list_mcp_servers` command.
 * Server-centric model: each server knows which agents it belongs to.
 * Use this type when calling invoke('list_mcp_servers', { agent: null }).
 * Do NOT confuse with AgentMCPServer, which has no `agents` field.
 */
export interface RawMCPServer {
  id: string;
  name: string;
  type: string; // "stdio" | "sse" | "http" | "streamable-http"
  enabled: boolean;
  connectionStatus: string | null;
  config: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
    method?: string;
  };
  agents: Array<{
    agent: string;
    enabled: boolean;
    configPath: string;
    format: string;
    syncStatus: string;
    lastSyncedAt: string | null;
    lastError: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

// ─── Backward Compatibility ─────────────────────────────────────────────────

/** @deprecated Use AgentMCPServer instead */
export type MCPServer = AgentMCPServer;

/** @deprecated No longer needed - MCP is directly tied to Agent */
export interface MCPAgentBinding {
  agent: string;
  enabled: boolean;
  configPath: string;
  format: string;
  syncStatus: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}

/** @deprecated Use direct agent parameter instead */
export interface MCPAgentBindingInput {
  agent: string;
  enabled: boolean;
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface MCPState {
  // Data - organized by agent
  agentServers: Map<string, AgentMCPServer[]>;
  isLoading: boolean;
  error: string | null;

  // Global view — all servers across all agents (server-centric)
  allServers: RawMCPServer[];
  isLoadingAll: boolean;
  loadAllError: string | null;

  // Currently selected agent for MCP management
  selectedAgent: string | null;

  // Modals
  addModalOpen: boolean;
  editingServer: AgentMCPServer | null;
  importModalOpen: boolean;
  isImporting: boolean;

  // Actions - all operations require agent parameter
  fetchAgentServers: (agent: string) => Promise<void>;
  addAgentServer: (
    agent: string,
    name: string,
    serverType: string,
    config: Record<string, unknown>
  ) => Promise<AgentMCPServer | null>;
  updateAgentServer: (
    agent: string,
    id: string,
    updates: {
      name?: string;
      config?: Record<string, unknown>;
    }
  ) => Promise<AgentMCPServer | null>;
  removeAgentServer: (agent: string, id: string) => Promise<void>;
  toggleAgentServer: (agent: string, id: string, enabled: boolean) => Promise<void>;

  // Import - read existing MCP config from agent
  importFromAgent: (agent: string) => Promise<AgentMCPServer[]>;

  // Global view — fetch all servers across all agents
  fetchAllServers: () => Promise<void>;

  // Setters
  setSelectedAgent: (agent: string | null) => void;
  setAddModalOpen: (open: boolean) => void;
  setEditingServer: (server: AgentMCPServer | null) => void;
  setImportModalOpen: (open: boolean) => void;

  // ─── Backward Compatibility (deprecated) ────────────────────────────
  /** @deprecated Use agentServers map instead */
  servers: AgentMCPServer[];
  /** @deprecated Use fetchAgentServers instead */
  fetchServers: () => Promise<void>;
  /** @deprecated Use addAgentServer instead */
  addServer: (name: string, serverType: string, config: Record<string, unknown>, agents: { agent: string; enabled: boolean }[]) => Promise<AgentMCPServer | null>;
  /** @deprecated Use updateAgentServer instead */
  updateServer: (id: string, updates: { name?: string; config?: Record<string, unknown>; agents?: { agent: string; enabled: boolean }[] }) => Promise<AgentMCPServer | null>;
  /** @deprecated Use removeAgentServer instead */
  removeServer: (id: string) => Promise<void>;
  /** @deprecated Use toggleAgentServer instead */
  toggleAgent: (serverId: string, agent: string, enabled: boolean) => Promise<void>;
}

export const useMCPStore = create<MCPState>((set, get) => ({
  // Data
  agentServers: new Map(),
  isLoading: false,
  error: null,

  // Global view state
  allServers: [],
  isLoadingAll: false,
  loadAllError: null,

  // Selected agent
  selectedAgent: null,

  // Modals
  addModalOpen: false,
  editingServer: null,
  importModalOpen: false,
  isImporting: false,

  // ─── Actions ────────────────────────────────────────────────────────

  fetchAgentServers: async (agent) => {
    set({ isLoading: true, error: null });
    try {
      const servers = await invoke<AgentMCPServer[]>('list_agent_mcp_servers', { agent });
      const newMap = new Map(get().agentServers);
      newMap.set(agent, servers);
      set({ agentServers: newMap, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  addAgentServer: async (agent, name, serverType, config) => {
    set({ isLoading: true, error: null });
    try {
      const server = await invoke<AgentMCPServer>('add_agent_mcp_server', {
        agent,
        name,
        serverType,
        config,
      });
      await get().fetchAgentServers(agent);
      await useAgentsStore.getState().fetchAgents();
      set({ addModalOpen: false });
      return server;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      return null;
    }
  },

  updateAgentServer: async (agent, id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const server = await invoke<AgentMCPServer>('update_agent_mcp_server', {
        agent,
        id,
        ...updates,
      });
      await get().fetchAgentServers(agent);
      await useAgentsStore.getState().fetchAgents();
      set({ editingServer: null });
      return server;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      return null;
    }
  },

  removeAgentServer: async (agent, id) => {
    set({ isLoading: true, error: null });
    try {
      await invoke('remove_agent_mcp_server', { agent, id });
      await get().fetchAgentServers(agent);
      await useAgentsStore.getState().fetchAgents();
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  toggleAgentServer: async (agent, id, enabled) => {
    try {
      await invoke('toggle_agent_mcp_server', { agent, id, enabled });
      await get().fetchAgentServers(agent);
      await useAgentsStore.getState().fetchAgents();
    } catch (err) {
      set({ error: String(err) });
    }
  },

  importFromAgent: async (agent) => {
    set({ isImporting: true, error: null });
    try {
      const servers = await invoke<AgentMCPServer[]>('import_mcp_from_agent', { agent });
      await get().fetchAgentServers(agent);
      await useAgentsStore.getState().fetchAgents();
      set({ isImporting: false });
      return servers;
    } catch (err) {
      set({ error: String(err), isImporting: false });
      throw err;
    }
  },

  fetchAllServers: async () => {
    set({ isLoadingAll: true, loadAllError: null });
    try {
      const servers = await invoke<RawMCPServer[]>('list_mcp_servers', { agent: null });
      set({ allServers: servers, isLoadingAll: false });
    } catch (err) {
      set({ loadAllError: String(err), isLoadingAll: false });
    }
  },

  // ─── Setters ────────────────────────────────────────────────────────

  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
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

  // ─── Backward Compatibility (deprecated) ────────────────────────────
  servers: [],
  fetchServers: async () => {
    // No-op: use fetchAgentServers(agent) instead
    console.warn('fetchServers is deprecated, use fetchAgentServers(agent) instead');
  },
  addServer: async () => {
    console.warn('addServer is deprecated, use addAgentServer instead');
    return null;
  },
  updateServer: async () => {
    console.warn('updateServer is deprecated, use updateAgentServer instead');
    return null;
  },
  removeServer: async () => {
    console.warn('removeServer is deprecated, use removeAgentServer instead');
  },
  toggleAgent: async () => {
    console.warn('toggleAgent is deprecated, use toggleAgentServer instead');
  },
}));
