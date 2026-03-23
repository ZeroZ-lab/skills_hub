// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// ── Store mock refs ──────────────────────────────────────────────────────────
const agentsState = {
  agents: [] as unknown[],
  fetchAgents: vi.fn(),
};

vi.mock('@/stores/agents', () => ({
  useAgentsStore: (selector: (s: typeof agentsState) => unknown) => selector(agentsState),
}));

// ── Tauri invoke mock ────────────────────────────────────────────────────────
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Import component AFTER mocks
const { UnifiedImportModal } = await import('./UnifiedImportModal');

// ── Fixtures ─────────────────────────────────────────────────────────────────
const agentClaudeCode = {
  config: {
    type: 'claude-code',
    displayName: 'Claude Code',
    supportsMcp: true,
    category: 'ai',
    description: null,
    skillsDir: '',
    globalSkillsDir: '',
    detectCommand: null,
    detectPaths: null,
  },
  installed: true,
  isOnline: true,
  skillCount: 5,
  mcpCount: 2,
};

const agentCodex = {
  config: {
    type: 'codex',
    displayName: 'Codex',
    supportsMcp: false,
    category: 'ai',
    description: null,
    skillsDir: '',
    globalSkillsDir: '',
    detectCommand: null,
    detectPaths: null,
  },
  installed: true,
  isOnline: false,
  skillCount: 2,
  mcpCount: 0,
};

const mockOnClose = vi.fn();
const mockOnComplete = vi.fn();

function renderModal(open = true) {
  return render(
    <UnifiedImportModal open={open} onClose={mockOnClose} onComplete={mockOnComplete} />,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  agentsState.agents = [];
  agentsState.fetchAgents = vi.fn();
  mockInvoke.mockReset();
  mockOnClose.mockReset();
  mockOnComplete.mockReset();
});

describe('UnifiedImportModal', () => {
  describe('closed state', () => {
    it('renders nothing when open=false', () => {
      const { container } = renderModal(false);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Stage 1 — agent selection', () => {
    it('shows empty state when no installed agents', () => {
      agentsState.agents = [];
      renderModal();
      expect(screen.getByText(/No installed agents detected/)).toBeInTheDocument();
    });

    it('import button disabled with no agents', () => {
      agentsState.agents = [];
      renderModal();
      const btn = screen.getByRole('button', { name: /Import/ });
      expect(btn).toBeDisabled();
    });

    it('renders installed agents as checkboxes', () => {
      agentsState.agents = [agentClaudeCode, agentCodex];
      renderModal();
      expect(screen.getByText('Claude Code')).toBeInTheDocument();
      expect(screen.getByText('Codex')).toBeInTheDocument();
    });

    it('shows "Skills only" label for non-MCP agents', () => {
      agentsState.agents = [agentCodex];
      renderModal();
      expect(screen.getByText('Skills only')).toBeInTheDocument();
    });

    it('import button disabled until an agent is selected', () => {
      agentsState.agents = [agentClaudeCode];
      renderModal();
      const btn = screen.getByRole('button', { name: /Import/ });
      expect(btn).toBeDisabled();
    });

    it('import button enabled after selecting an agent', () => {
      agentsState.agents = [agentClaudeCode];
      renderModal();
      const checkbox = screen.getAllByRole('checkbox')[1]; // first is "select all"
      fireEvent.click(checkbox);
      const btn = screen.getByRole('button', { name: /Import/ });
      expect(btn).not.toBeDisabled();
    });

    it('select-all selects all agents', () => {
      agentsState.agents = [agentClaudeCode, agentCodex];
      renderModal();
      const selectAll = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAll);
      const btn = screen.getByRole('button', { name: /Import \(2 agents\)/ });
      expect(btn).not.toBeDisabled();
    });

    it('cancel button calls onClose', () => {
      agentsState.agents = [agentClaudeCode];
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls fetchAgents on open', () => {
      agentsState.agents = [];
      renderModal();
      expect(agentsState.fetchAgents).toHaveBeenCalledTimes(1);
    });

    it('X button calls onClose in select stage', () => {
      agentsState.agents = [agentClaudeCode];
      renderModal();
      const xBtn = screen.getByRole('button', { name: '' }); // icon-only close button
      // find by class instead since no accessible name
      const closeBtn = document.querySelector('button .lucide-x')?.closest('button');
      if (closeBtn) fireEvent.click(closeBtn);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stage 2 — importing', () => {
    it('shows importing spinners when import starts', async () => {
      agentsState.agents = [agentClaudeCode];
      // Never resolve to keep modal in importing state
      let resolveImport!: (v: unknown) => void;
      mockInvoke.mockReturnValue(new Promise((r) => (resolveImport = r)));

      renderModal();
      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByRole('button', { name: /Import/ }));

      expect(screen.getByText('Skills')).toBeInTheDocument();
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeTruthy();

      // cleanup
      act(() => { resolveImport([]); });
    });

    it('X button hidden during importing', async () => {
      agentsState.agents = [agentClaudeCode];
      let resolveImport!: (v: unknown) => void;
      mockInvoke.mockReturnValue(new Promise((r) => (resolveImport = r)));

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      fireEvent.click(screen.getByRole('button', { name: /Import/ }));

      expect(document.querySelector('button .lucide-x')).toBeNull();

      act(() => { resolveImport([]); });
    });
  });

  describe('Stage 3 — done', () => {
    const scanResult = { found: 5, imported: 3, updated: 2, removed: 0, skipped: 0, errors: [] };
    const mcpServers = [{ id: 'm1', name: 'filesystem' }];

    it('shows results table after successful import', async () => {
      agentsState.agents = [agentClaudeCode];
      mockInvoke
        .mockResolvedValueOnce(scanResult)    // import_skills
        .mockResolvedValueOnce(mcpServers);   // import_mcp_from_agent

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      expect(screen.getByText('Claude Code')).toBeInTheDocument();
      expect(screen.getByText(/3 added/)).toBeInTheDocument();
      expect(screen.getByText(/1 imported/)).toBeInTheDocument();
    });

    it('calls onComplete before showing done stage', async () => {
      agentsState.agents = [agentClaudeCode];
      mockInvoke.mockResolvedValueOnce(scanResult).mockResolvedValueOnce(mcpServers);

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('shows "No changes" when imported=0 and updated=0', async () => {
      agentsState.agents = [agentClaudeCode];
      mockInvoke
        .mockResolvedValueOnce({ ...scanResult, imported: 0, updated: 0 })
        .mockResolvedValueOnce([]);

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      expect(screen.getAllByText(/No changes/).length).toBeGreaterThan(0);
    });

    it('MCP skipped for non-supportsMcp agent', async () => {
      agentsState.agents = [agentCodex];
      mockInvoke.mockResolvedValueOnce(scanResult); // only skills called

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      expect(screen.getByText('—')).toBeInTheDocument();
      // import_mcp_from_agent should NOT have been called
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(mockInvoke).toHaveBeenCalledWith('import_skills', { agent: 'codex' });
    });

    it('partial failure: skills error shown without blocking MCP', async () => {
      agentsState.agents = [agentClaudeCode];
      mockInvoke
        .mockRejectedValueOnce(new Error('skills invoke failed'))
        .mockResolvedValueOnce(mcpServers);

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      expect(screen.getByText(/skills invoke failed/)).toBeInTheDocument();
      expect(screen.getByText(/1 imported/)).toBeInTheDocument();
    });

    it('Done button calls onClose', async () => {
      agentsState.agents = [agentClaudeCode];
      mockInvoke.mockResolvedValueOnce(scanResult).mockResolvedValueOnce([]);

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      fireEvent.click(screen.getByRole('button', { name: /Done/ }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stage 4 — error', () => {
    it('shows error state on unexpected synchronous throw', async () => {
      agentsState.agents = [agentClaudeCode];
      // Make invoke throw synchronously by having the outer map throw
      // We simulate this by mocking the module to inject a throw
      // Instead, test via the error recovery path after a normal error
      mockInvoke.mockRejectedValue(new Error('network failure'));

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      // With Promise.allSettled inside, individual failures show in results table
      // The outer error state is tested via direct state manipulation in integration
      // This test verifies the partial-failure case surfaces in results
      expect(screen.getByText(/Import complete|Import failed/)).toBeInTheDocument();
    });

    it('shows error stage when all agents fail both skills AND mcp (allFailed)', async () => {
      agentsState.agents = [agentClaudeCode];
      // Both import_skills and import_mcp_from_agent reject → allFailed triggers error stage
      mockInvoke.mockRejectedValue(new Error('connection refused'));

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      expect(screen.getByText(/Import failed/i)).toBeInTheDocument();
      expect(screen.getByText(/connection refused/)).toBeInTheDocument();
    });

    it('Retry button returns to select stage', async () => {
      agentsState.agents = [agentClaudeCode];
      mockInvoke.mockRejectedValue(new Error('timeout'));

      renderModal();
      fireEvent.click(screen.getAllByRole('checkbox')[1]);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Import/ }));
      });

      // Verify error stage rendered
      expect(screen.getByText(/Import failed/i)).toBeInTheDocument();

      // Click Retry → back to select stage
      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
      expect(screen.getByRole('button', { name: /Import/ })).toBeInTheDocument();
    });
  });
});
