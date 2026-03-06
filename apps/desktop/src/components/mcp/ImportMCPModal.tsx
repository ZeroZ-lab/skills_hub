import { useState, useEffect } from 'react';
import { X, Loader2, Check, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMCPStore } from '@/stores/mcp';
import type { MCPServer } from '@/stores/mcp';
import { useAgentsStore, getAgentColor, getAgentDisplayName } from '@/stores/agents';

interface ImportMCPModalProps {
  open: boolean;
  onClose: () => void;
}

type ImportStep = 'select' | 'importing' | 'done' | 'error';

export function ImportMCPModal({ open, onClose }: ImportMCPModalProps) {
  const { importFromAgent, isImporting, error } = useMCPStore();
  const { agents, fetchAgents } = useAgentsStore();
  const supportedAgents = agents.filter((a) => a.installed && a.config.supportsMcp);

  const [step, setStep] = useState<ImportStep>('select');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [importedServers, setImportedServers] = useState<MCPServer[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchAgents();
      setStep('select');
      setSelectedAgent(null);
      setImportedServers([]);
      setImportError(null);
    }
  }, [open, fetchAgents]);

  if (!open) return null;

  const handleImport = async () => {
    if (!selectedAgent) return;
    setStep('importing');
    setImportError(null);

    try {
      const servers = await importFromAgent(selectedAgent);
      setImportedServers(servers);
      setStep('done');
    } catch (err) {
      setImportError(String(err));
      setStep('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => {
        if (!isImporting) onClose();
      }}
    >
      <div
        className="relative w-[480px] max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Import MCP Servers</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            disabled={isImporting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {/* ── Step: Select Agent ── */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground font-medium mb-1">
                  Select an agent to import from
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  This will scan the agent configuration and import any MCP server definitions
                  found.
                </p>
              </div>

              {supportedAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/30 mb-3">
                    <Download className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No MCP-compatible agents detected. Install or enable one first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supportedAgents.map((agent) => (
                    <button
                      key={agent.config.type}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all duration-150',
                        selectedAgent === agent.config.type
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-transparent hover:bg-accent/30'
                      )}
                      onClick={() => setSelectedAgent(agent.config.type)}
                    >
                      <div
                        className={cn(
                          'flex h-3 w-3 items-center justify-center rounded-full border-2 shrink-0',
                          selectedAgent === agent.config.type
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        )}
                      >
                        {selectedAgent === agent.config.type && (
                          <span className="h-1 w-1 rounded-full bg-white" />
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('text-xs px-2 py-0.5', getAgentColor(agent.config.type))}
                      >
                        {getAgentDisplayName(agent.config.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {agent.mcpCount} MCP servers configured
                      </span>
                      {agent.isOnline && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          Online
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={!selectedAgent}>
                  <Download className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
            </div>
          )}

          {/* ── Importing ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <h3 className="text-sm font-medium text-foreground mb-1">Importing MCP servers...</h3>
              <p className="text-xs text-muted-foreground">
                Scanning {selectedAgent ? getAgentDisplayName(selectedAgent) : 'agent'}{' '}
                configuration
              </p>
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 mb-4">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">Import complete</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Imported {importedServers.length} server{importedServers.length !== 1 ? 's' : ''}{' '}
                from {selectedAgent ? getAgentDisplayName(selectedAgent) : 'agent'}
              </p>
              {importedServers.length > 0 && (
                <div className="w-full max-w-xs space-y-1.5 mb-4">
                  {importedServers.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
                    >
                      <span className="text-sm text-foreground truncate">{s.name}</span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] px-1.5 py-0 uppercase shrink-0"
                      >
                        {s.type === 'streamable-http' ? 'http' : s.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={onClose}>Done</Button>
            </div>
          )}

          {/* ── Error ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">Import failed</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                {importError || error || 'An unknown error occurred'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('select');
                    setImportError(null);
                  }}
                >
                  Try Again
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
