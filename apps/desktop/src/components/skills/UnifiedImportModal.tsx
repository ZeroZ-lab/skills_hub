import { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';
import { useAgentsStore } from '@/stores/agents';
import type { AgentMCPServer } from '@/stores/mcp';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScanResult {
  found: number;
  imported: number;
  updated: number;
  removed: number;
  skipped: number;
  errors: string[];
}

interface AgentImportResult {
  agentType: string;
  agentDisplayName: string;
  skills: { status: 'ok' | 'error'; added?: number; updated?: number; errors?: string[]; error?: string };
  mcp: { status: 'ok' | 'error' | 'skipped'; count?: number; error?: string };
}

type Stage = 'select' | 'importing' | 'done' | 'error';

interface UnifiedImportModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function skillsSummary(s: AgentImportResult['skills']): string {
  if (s.status === 'error') return s.error ?? 'Error';
  const { added = 0, updated = 0 } = s;
  if (added === 0 && updated === 0) return 'No changes';
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} added`);
  if (updated > 0) parts.push(`${updated} upd`);
  return parts.join(', ');
}

function mcpSummary(m: AgentImportResult['mcp']): string {
  if (m.status === 'skipped') return '—';
  if (m.status === 'error') return m.error ?? 'Error';
  const count = m.count ?? 0;
  return count === 0 ? 'No changes' : `${count} imported`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UnifiedImportModal({ open, onClose, onComplete }: UnifiedImportModalProps) {
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const installedAgents = agents.filter((a) => a.installed);

  const [stage, setStage] = useState<Stage>('select');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [results, setResults] = useState<AgentImportResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStage('select');
      setSelectedAgents([]);
      setResults([]);
      setErrorMsg(null);
      void fetchAgents();
    }
  }, [open, fetchAgents]);

  if (!open) return null;

  // ── Selection helpers ──
  const allSelected =
    installedAgents.length > 0 && selectedAgents.length === installedAgents.length;
  const someSelected =
    selectedAgents.length > 0 && selectedAgents.length < installedAgents.length;

  const toggleAgent = (type: string) => {
    setSelectedAgents((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(installedAgents.map((a) => a.config.type));
    }
  };

  // ── Import execution ──
  const handleImport = async () => {
    setStage('importing');
    setErrorMsg(null);

    try {
      const chosen = installedAgents.filter((a) => selectedAgents.includes(a.config.type));

      const importResults: AgentImportResult[] = await Promise.all(
        chosen.map(async (agent): Promise<AgentImportResult> => {
          const [skillsResult, mcpResult] = await Promise.allSettled([
            invoke<ScanResult>('import_skills', { agent: agent.config.type }),
            agent.config.supportsMcp
              ? invoke<AgentMCPServer[]>('import_mcp_from_agent', { agent: agent.config.type })
              : Promise.resolve(null),
          ]);

          return {
            agentType: agent.config.type,
            agentDisplayName: agent.config.displayName,
            skills:
              skillsResult.status === 'fulfilled'
                ? {
                    status: 'ok',
                    added: skillsResult.value.imported,
                    updated: skillsResult.value.updated,
                    errors: skillsResult.value.errors,
                  }
                : { status: 'error', error: String(skillsResult.reason) },
            mcp: !agent.config.supportsMcp
              ? { status: 'skipped' }
              : mcpResult.status === 'fulfilled'
                ? { status: 'ok', count: (mcpResult.value as AgentMCPServer[]).length }
                : { status: 'error', error: String(mcpResult.reason) },
          };
        }),
      );

      setResults(importResults);
      onComplete(); // refresh stores before rendering results
      setStage('done');
    } catch (e) {
      setErrorMsg(String(e));
      setStage('error');
    }
  };

  // ── Total counts for summary row ──
  const totalSkillsAdded = results.reduce(
    (sum, r) => sum + (r.skills.status === 'ok' ? (r.skills.added ?? 0) : 0),
    0,
  );
  const totalMcpImported = results.reduce(
    (sum, r) => sum + (r.mcp.status === 'ok' ? (r.mcp.count ?? 0) : 0),
    0,
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Import from Agents</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Import Skills and MCP servers from your locally installed agents
            </p>
          </div>
          {stage !== 'importing' && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* Stage 1: Select agents */}
          {stage === 'select' && (
            <div className="space-y-4">
              {installedAgents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No installed agents detected. Run Detect Agents first.
                  </p>
                </div>
              ) : (
                <>
                  {/* Select all */}
                  <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent transition-colors">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium text-foreground">Select all agents</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {installedAgents.length} available
                    </span>
                  </label>

                  {/* Agent list */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {installedAgents.map((agent) => {
                      const checked = selectedAgents.includes(agent.config.type);
                      return (
                        <label
                          key={agent.config.type}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                            checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAgent(agent.config.type)}
                            className="h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground">
                              {agent.config.displayName}
                            </span>
                            <div className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                              <span>{agent.skillCount} skills</span>
                              {agent.config.supportsMcp && <span>{agent.mcpCount} MCP</span>}
                            </div>
                          </div>
                          {!agent.config.supportsMcp && (
                            <span className="text-xs text-muted-foreground">Skills only</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={selectedAgents.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Import ({selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''})
                </Button>
              </div>
            </div>
          )}

          {/* Stage 2: Importing */}
          {stage === 'importing' && (
            <div className="py-10 space-y-6">
              <div className="space-y-4">
                {[
                  { label: 'Skills', icon: <Loader2 className="h-4 w-4 animate-spin text-primary" /> },
                  { label: 'MCP Servers', icon: <Loader2 className="h-4 w-4 animate-spin text-primary" /> },
                ].map(({ label, icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    {icon}
                    <span className="text-sm text-foreground font-medium w-28">{label}</span>
                    <span className="text-sm text-muted-foreground">Importing...</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Processing {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''}…
              </p>
            </div>
          )}

          {/* Stage 3: Done */}
          {stage === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <h3 className="font-semibold text-foreground">Import complete</h3>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left pb-2 font-medium">Agent</th>
                    <th className="text-left pb-2 font-medium">Skills</th>
                    <th className="text-left pb-2 font-medium">MCP Servers</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.agentType} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium text-foreground">{r.agentDisplayName}</td>
                      <td className={cn('py-2 pr-4', r.skills.status === 'error' ? 'text-amber-500' : 'text-foreground')}>
                        {r.skills.status === 'error' ? '⚠ ' : '✓ '}{skillsSummary(r.skills)}
                        {r.skills.status === 'ok' && (r.skills.errors?.length ?? 0) > 0 && (
                          <span className="ml-1 text-xs text-amber-500">
                            ({r.skills.errors!.length} warn)
                          </span>
                        )}
                      </td>
                      <td className={cn('py-2', r.mcp.status === 'error' ? 'text-amber-500' : 'text-foreground')}>
                        {r.mcp.status === 'error' ? '⚠ ' : r.mcp.status === 'skipped' ? '' : '✓ '}
                        {mcpSummary(r.mcp)}
                      </td>
                    </tr>
                  ))}
                  {/* Summary row */}
                  <tr className="text-xs text-muted-foreground font-medium">
                    <td className="pt-3">Total</td>
                    <td className="pt-3">{totalSkillsAdded} skills</td>
                    <td className="pt-3">{totalMcpImported} MCP servers</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end pt-2">
                <Button onClick={onClose}>Done</Button>
              </div>
            </div>
          )}

          {/* Stage 4: Error (unrecoverable) */}
          {stage === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Import failed</h3>
                <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">{errorMsg}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={() => setStage('select')}>Retry</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
