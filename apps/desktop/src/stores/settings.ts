import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface AppConfig {
  defaultMode: string;
  defaultScope: string;
  updateInterval: number;
  cacheTTL: number;
  githubToken: string | null;
  theme: string;
  proxy: string | null;
  customAgentRegistry: string | null;
  sourceAliases: Record<string, string>;
}

interface SettingsState {
  config: AppConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveMessage: string | null;
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<boolean>;
}

const defaultConfig: AppConfig = {
  defaultMode: 'symlink',
  defaultScope: 'global',
  updateInterval: 24,
  cacheTTL: 24,
  githubToken: null,
  theme: 'system',
  proxy: null,
  customAgentRegistry: null,
  sourceAliases: {},
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config: null,
  isLoading: false,
  isSaving: false,
  error: null,
  saveMessage: null,
  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await invoke<AppConfig>('get_app_config');
      set({ config, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false, config: defaultConfig });
    }
  },
  updateConfig: async (updates) => {
    const current = get().config;
    if (!current) return false;

    const merged = { ...current, ...updates };
    set({ isSaving: true, error: null, saveMessage: null });
    try {
      const config = await invoke<AppConfig>('update_app_config', {
        config: merged,
      });
      set({ config, isSaving: false, saveMessage: 'Settings saved successfully' });
      setTimeout(() => set({ saveMessage: null }), 3000);
      return true;
    } catch (err) {
      set({ error: String(err), isSaving: false });
      setTimeout(() => set({ error: null }), 5000);
      return false;
    }
  },
}));
