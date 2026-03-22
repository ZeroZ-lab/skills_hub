import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DiscoveredSkill {
  id: string;
  name: string;
  source: string;
  install_source: string;
  installs: number;
  description?: string;
  category?: string;
  tags?: string[];
  created_at?: string;
}

export interface DiscoveredMCPServer {
  id: string;
  name: string;
  source: string;
  installs: number;
  description?: string;
  author?: string;
  stars?: number;
  created_at?: string;
}

export interface DiscoverResponse<T> {
  items: T[];
  cache_hit: boolean;
  refreshing: boolean;
  fetched_at: number;
}

export interface DiscoverFetchState {
  cacheHit: boolean;
  refreshing: boolean;
  fetchedAt: number | null;
}

interface DiscoverState {
  skillResults: DiscoveredSkill[];
  mcpResults: DiscoveredMCPServer[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  skillsFetch: DiscoverFetchState;
  mcpFetch: DiscoverFetchState;

  searchSkills: (query: string) => Promise<void>;
  loadFeaturedSkills: () => Promise<void>;
  searchMcpServers: (query: string) => Promise<void>;
  loadFeaturedMcpServers: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  installFromDiscover: (source: string) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useDiscoverStore = create<DiscoverState>((set) => ({
  skillResults: [],
  mcpResults: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  skillsFetch: { cacheHit: false, refreshing: false, fetchedAt: null },
  mcpFetch: { cacheHit: false, refreshing: false, fetchedAt: null },

  searchSkills: async (query: string) => {
    set({ isLoading: true, error: null, searchQuery: query });
    try {
      const response = await invoke<DiscoverResponse<DiscoveredSkill>>('discover_skills', {
        query,
        limit: 100,
      });
      set({
        skillResults: response.items,
        skillsFetch: {
          cacheHit: response.cache_hit,
          refreshing: response.refreshing,
          fetchedAt: response.fetched_at,
        },
        isLoading: false,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false, skillResults: [] });
    }
  },

  loadFeaturedSkills: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await invoke<DiscoverResponse<DiscoveredSkill>>('get_featured');
      set({
        skillResults: response.items,
        skillsFetch: {
          cacheHit: response.cache_hit,
          refreshing: response.refreshing,
          fetchedAt: response.fetched_at,
        },
        isLoading: false,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  searchMcpServers: async (query: string) => {
    set({ isLoading: true, error: null, searchQuery: query });
    try {
      const response = await invoke<DiscoverResponse<DiscoveredMCPServer>>('discover_mcp_servers', {
        query,
        limit: 50,
      });
      set({
        mcpResults: response.items,
        mcpFetch: {
          cacheHit: response.cache_hit,
          refreshing: response.refreshing,
          fetchedAt: response.fetched_at,
        },
        isLoading: false,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false, mcpResults: [] });
    }
  },

  loadFeaturedMcpServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await invoke<DiscoverResponse<DiscoveredMCPServer>>('get_featured_mcp');
      set({
        mcpResults: response.items,
        mcpFetch: {
          cacheHit: response.cache_hit,
          refreshing: response.refreshing,
          fetchedAt: response.fetched_at,
        },
        isLoading: false,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  installFromDiscover: (_source: string) => {
    // This will be handled by navigating to /installed with source pre-filled
    // The actual install logic lives in the skills store
  },
}));
