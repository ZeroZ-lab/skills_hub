import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMCPStore } from './mcp';

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));
vi.mock('./agents', () => ({
  useAgentsStore: {
    getState: () => ({ fetchAgents: vi.fn() }),
  },
}));

const INITIAL_GLOBAL_STATE = {
  allServers: [],
  isLoadingAll: false,
  loadAllError: null,
};

describe('MCP Store — fetchAllServers', () => {
  beforeEach(() => {
    useMCPStore.setState(INITIAL_GLOBAL_STATE);
    mockInvoke.mockClear();
  });

  it('initial state', () => {
    const state = useMCPStore.getState();
    expect(state.allServers).toEqual([]);
    expect(state.isLoadingAll).toBe(false);
    expect(state.loadAllError).toBeNull();
  });

  it('sets isLoadingAll=true while pending', () => {
    // Don't resolve the promise — check intermediate state
    let resolvePromise!: (v: unknown) => void;
    mockInvoke.mockReturnValueOnce(new Promise((r) => (resolvePromise = r)));

    void useMCPStore.getState().fetchAllServers();

    expect(useMCPStore.getState().isLoadingAll).toBe(true);
    // cleanup
    resolvePromise([]);
  });

  it('populates allServers on success', async () => {
    const servers = [
      {
        id: 's1',
        name: 'filesystem',
        type: 'stdio',
        enabled: true,
        connectionStatus: 'connected',
        config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
        agents: [
          {
            agent: 'claude-code',
            enabled: true,
            configPath: '/path/config.json',
            format: 'json',
            syncStatus: 'synced',
            lastSyncedAt: null,
            lastError: null,
          },
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];
    mockInvoke.mockResolvedValueOnce(servers);

    await useMCPStore.getState().fetchAllServers();

    const state = useMCPStore.getState();
    expect(state.allServers).toEqual(servers);
    expect(state.isLoadingAll).toBe(false);
    expect(state.loadAllError).toBeNull();
  });

  it('invokes list_mcp_servers with agent: null', async () => {
    mockInvoke.mockResolvedValueOnce([]);

    await useMCPStore.getState().fetchAllServers();

    expect(mockInvoke).toHaveBeenCalledWith('list_mcp_servers', { agent: null });
  });

  it('sets loadAllError on failure and clears isLoadingAll', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('invoke failed'));

    await useMCPStore.getState().fetchAllServers();

    const state = useMCPStore.getState();
    expect(state.loadAllError).toBe('Error: invoke failed');
    expect(state.isLoadingAll).toBe(false);
    expect(state.allServers).toEqual([]);
  });

  it('clears loadAllError on subsequent successful call', async () => {
    useMCPStore.setState({ loadAllError: 'stale error' });
    mockInvoke.mockResolvedValueOnce([]);

    await useMCPStore.getState().fetchAllServers();

    expect(useMCPStore.getState().loadAllError).toBeNull();
  });
});
