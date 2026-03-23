// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Store mock refs — updated per test
const mcpState = {
  allServers: [] as unknown[],
  isLoadingAll: false,
  loadAllError: null as string | null,
  fetchAllServers: vi.fn(),
};
const agentsState = {
  agents: [] as unknown[],
  fetchAgents: vi.fn(),
};

vi.mock('@/stores/mcp', () => ({
  useMCPStore: (selector: (s: typeof mcpState) => unknown) => selector(mcpState),
}));
vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector: (s: typeof agentsState) => unknown) => selector(agentsState),
}));

// Import component AFTER mocks are in place
const { MCPGlobalView } = await import('./MCPGlobalView');

function renderView() {
  return render(
    <MemoryRouter>
      <MCPGlobalView />
    </MemoryRouter>
  );
}

const agentClaudeCode = {
  config: {
    type: 'claude-code',
    displayName: 'Claude Code',
    supportsMcp: true,
    description: null,
    category: 'ai',
    skillsDir: '',
    globalSkillsDir: '',
    detectCommand: null,
    detectPaths: null,
  },
  installed: true,
  isOnline: true,
  skillCount: 0,
  mcpCount: 1,
};

const serverFilesystem = {
  id: 's1',
  name: 'filesystem',
  type: 'stdio',
  enabled: true,
  connectionStatus: 'connected',
  config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
  agents: [{ agent: 'claude-code', enabled: true, configPath: '', format: 'json', syncStatus: 'synced', lastSyncedAt: null, lastError: null }],
  createdAt: '',
  updatedAt: '',
};

beforeEach(() => {
  mcpState.allServers = [];
  mcpState.isLoadingAll = false;
  mcpState.loadAllError = null;
  mcpState.fetchAllServers = vi.fn();
  agentsState.agents = [];
  agentsState.fetchAgents = vi.fn();
});

describe('MCPGlobalView', () => {
  it('shows spinner when isLoadingAll=true', () => {
    mcpState.isLoadingAll = true;
    renderView();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows error banner when loadAllError is set', () => {
    mcpState.loadAllError = 'invoke failed';
    renderView();
    expect(screen.getByText('invoke failed')).toBeInTheDocument();
  });

  it('shows retry button in error state', () => {
    mcpState.loadAllError = 'invoke failed';
    renderView();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty CTA when no servers and not loading', () => {
    agentsState.agents = [agentClaudeCode];
    renderView();
    expect(screen.getByText('No MCP assets yet')).toBeInTheDocument();
  });

  it('shows navigate-to-agents button in empty state', () => {
    agentsState.agents = [agentClaudeCode];
    renderView();
    expect(screen.getByText('Agent Assembly')).toBeInTheDocument();
  });

  it('renders agent group with server name', () => {
    agentsState.agents = [agentClaudeCode];
    mcpState.allServers = [serverFilesystem];
    renderView();
    expect(screen.getByText('filesystem')).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
  });

  it('renders Details button linking to agent page', () => {
    agentsState.agents = [agentClaudeCode];
    mcpState.allServers = [serverFilesystem];
    renderView();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('does not show agent group for non-MCP agents', () => {
    const nonMcpAgent = {
      ...agentClaudeCode,
      config: { ...agentClaudeCode.config, type: 'other-agent', displayName: 'Other Agent', supportsMcp: false },
    };
    agentsState.agents = [nonMcpAgent];
    mcpState.allServers = [serverFilesystem];
    renderView();
    expect(screen.queryByText('Other Agent')).not.toBeInTheDocument();
  });

  it('shows connected status dot (green) for connected server', () => {
    agentsState.agents = [agentClaudeCode];
    mcpState.allServers = [{ ...serverFilesystem, connectionStatus: 'connected' }];
    renderView();
    const dot = document.querySelector('.bg-green-500');
    expect(dot).toBeTruthy();
  });

  it('shows error status dot (red) for errored server', () => {
    agentsState.agents = [agentClaudeCode];
    mcpState.allServers = [{ ...serverFilesystem, connectionStatus: 'error' }];
    renderView();
    const dot = document.querySelector('.bg-red-500');
    expect(dot).toBeTruthy();
  });

  it('shows gray dot for null connectionStatus', () => {
    agentsState.agents = [agentClaudeCode];
    mcpState.allServers = [{ ...serverFilesystem, connectionStatus: null }];
    renderView();
    const dot = document.querySelector('.bg-muted-foreground\\/40');
    expect(dot).toBeTruthy();
  });

  it('calls fetchAllServers on mount', () => {
    renderView();
    expect(mcpState.fetchAllServers).toHaveBeenCalledTimes(1);
  });

  it('calls fetchAgents on mount when agents list is empty', () => {
    agentsState.agents = [];
    renderView();
    expect(agentsState.fetchAgents).toHaveBeenCalledTimes(1);
  });

  it('does not call fetchAgents when agents already loaded', () => {
    agentsState.agents = [agentClaudeCode];
    renderView();
    expect(agentsState.fetchAgents).not.toHaveBeenCalled();
  });
});
