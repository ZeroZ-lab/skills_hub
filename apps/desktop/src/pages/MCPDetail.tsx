import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Terminal,
  Globe,
  Radio,
  Calendar,
  Trash2,
  Pencil,
  RefreshCw,
  Loader2,
  AlertCircle,
  Server,
  Copy,
  Check,
} from 'lucide-react';
import type { MCPServer } from '@/stores/mcp';
import { useMCPStore } from '@/stores/mcp';
import { getAgentColor, getAgentDisplayName } from '@/stores/agents';
import { MCPServerForm } from '@/components/mcp/MCPServerForm';

const TYPE_BADGE_STYLES: Record<string, { className: string; icon: React.ElementType }> = {
  stdio: {
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    icon: Terminal,
  },
  sse: {
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    icon: Radio,
  },
  'streamable-http': {
    className: 'bg-green-500/15 text-green-400 border-green-500/25',
    icon: Globe,
  },
};

const SYNC_STATUS_COLORS: Record<string, string> = {
  synced: 'bg-green-500',
  pending: 'bg-yellow-500',
  error: 'bg-red-500',
};

const SYNC_STATUS_TEXT: Record<string, string> = {
  synced: 'text-green-400',
  pending: 'text-yellow-400',
  error: 'text-red-400',
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getTypeLabel(type: string): string {
  if (type === 'streamable-http') return 'HTTP (Streamable)';
  return type.toUpperCase();
}

export default function MCPDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { removeServer, toggleAgent, fetchServers } = useMCPStore();

  const [server, setServer] = useState<MCPServer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const serverId = id ? decodeURIComponent(id) : '';

  const loadServer = async () => {
    if (!serverId) return;
    setIsLoading(true);
    setError(null);
    try {
      const servers = await invoke<MCPServer[]>('list_mcp_servers');
      const found = servers.find((s) => s.id === serverId);
      if (found) {
        setServer(found);
      } else {
        setError(`Server with ID "${serverId}" not found.`);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServer();
  }, [serverId]);

  const handleRemove = async () => {
    if (!server) return;
    setIsRemoving(true);
    try {
      await removeServer(server.id);
      navigate('/mcp');
    } catch {
      setIsRemoving(false);
    }
  };

  const handleToggleAgent = async (agent: string, enabled: boolean) => {
    if (!server) return;
    await toggleAgent(server.id, agent, enabled);
    await loadServer();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleEditClose = () => {
    setIsEditing(false);
    loadServer();
    fetchServers();
  };

  // Build a config JSON preview for each agent
  const buildAgentConfigPreview = () => {
    if (!server) return '';
    const entry: Record<string, unknown> = {};
    if (server.type === 'stdio') {
      entry.command = server.config.command;
      if (server.config.args && server.config.args.length > 0) {
        entry.args = server.config.args;
      }
      if (server.config.env && Object.keys(server.config.env).length > 0) {
        entry.env = server.config.env;
      }
    } else {
      entry.url = server.config.url;
      if (server.config.headers && Object.keys(server.config.headers).length > 0) {
        entry.headers = server.config.headers;
      }
    }

    const configObj = {
      mcpServers: {
        [server.name]: entry,
      },
    };
    return JSON.stringify(configObj, null, 2);
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div>
        <Header
          title="MCP Server"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/mcp')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !server) {
    return (
      <div>
        <Header
          title="MCP Server"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/mcp')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Failed to load server</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {error || `Server "${serverId}" not found.`}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/mcp')}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const typeBadge = TYPE_BADGE_STYLES[server.type] || TYPE_BADGE_STYLES.stdio;
  const TypeIcon = typeBadge.icon;
  const configJson = JSON.stringify(server.config, null, 2);

  return (
    <div className="flex h-full flex-col">
      <Header
        title={server.name}
        description={`${getTypeLabel(server.type)} MCP Server`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/mcp')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-8 space-y-6">
          {/* ── Server header card ── */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
                  server.type === 'stdio'
                    ? 'bg-blue-500/10 text-blue-400'
                    : server.type === 'sse'
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'bg-green-500/10 text-green-400'
                )}
              >
                <TypeIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-foreground">{server.name}</h2>
                  <Badge
                    variant="outline"
                    className={cn('text-xs px-2 py-0.5 uppercase', typeBadge.className)}
                  >
                    {server.type === 'streamable-http' ? 'http' : server.type}
                  </Badge>
                  {!server.enabled && (
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-0.5 bg-gray-500/15 text-gray-400 border-gray-500/25"
                    >
                      Disabled
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Created {formatDate(server.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Updated {formatDate(server.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Server className="h-3.5 w-3.5" />
                    {server.agents.length} agent{server.agents.length !== 1 ? 's' : ''} bound
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* ── Left column: Main content ── */}
            <div className="col-span-2 space-y-6">
              {/* Agent Bindings Table */}
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Agent Bindings ({server.agents.length})
                  </span>
                </div>
                {server.agents.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No agents are bound to this server. Edit the server to add agent bindings.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {server.agents.map((binding) => (
                      <div
                        key={binding.agent}
                        className="px-4 py-3 space-y-2"
                      >
                        <div className="flex items-center gap-3">
                          {/* Sync status dot */}
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full shrink-0',
                              SYNC_STATUS_COLORS[binding.syncStatus] || 'bg-gray-500'
                            )}
                            title={`Sync: ${binding.syncStatus}`}
                          />
                          {/* Agent name */}
                          <Badge
                            variant="outline"
                            className={cn('text-xs px-2 py-0.5', getAgentColor(binding.agent))}
                          >
                            {getAgentDisplayName(binding.agent)}
                          </Badge>
                          {/* Enabled toggle */}
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[11px] text-muted-foreground">
                              {binding.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <Switch
                              checked={binding.enabled}
                              onCheckedChange={(checked) =>
                                handleToggleAgent(binding.agent, checked)
                              }
                            />
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="ml-5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div>
                            <span className="text-muted-foreground">Config Path:</span>
                            <span className="ml-1.5 font-mono text-[11px] text-foreground break-all">
                              {binding.configPath}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Format:</span>
                            <span className="ml-1.5 text-foreground">{binding.format}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sync Status:</span>
                            <span
                              className={cn(
                                'ml-1.5 font-medium capitalize',
                                SYNC_STATUS_TEXT[binding.syncStatus] || 'text-gray-400'
                              )}
                            >
                              {binding.syncStatus}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Synced:</span>
                            <span className="ml-1.5 text-foreground">
                              {binding.lastSyncedAt ? formatDate(binding.lastSyncedAt) : 'Never'}
                            </span>
                          </div>
                          {binding.lastError && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Error:</span>
                              <span className="ml-1.5 text-red-400 text-[11px]">
                                {binding.lastError}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Config File Previews */}
              {server.agents.length > 0 && (
                <div className="rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Copy className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      Config File Previews
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {server.agents.map((binding) => {
                      const preview = buildAgentConfigPreview();
                      return (
                        <div key={binding.agent} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0',
                                  getAgentColor(binding.agent)
                                )}
                              >
                                {getAgentDisplayName(binding.agent)}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {binding.configPath}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleCopy(preview)}
                            >
                              {copiedText === preview ? (
                                <>
                                  <Check className="mr-1 h-3 w-3 text-green-400" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-1 h-3 w-3" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <pre className="rounded-md bg-muted/40 p-3 text-[11px] font-mono text-foreground/80 overflow-x-auto">
                            {preview}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column: Sidebar info ── */}
            <div className="space-y-6">
              {/* Full Config */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Configuration</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCopy(configJson)}
                  >
                    {copiedText === configJson ? (
                      <>
                        <Check className="mr-1 h-3 w-3 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <Separator />
                <pre className="rounded-md bg-muted/40 p-3 text-[11px] font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap break-words">
                  {configJson}
                </pre>
              </div>

              {/* Server Details */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Details</h4>
                <Separator />
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Server ID:</span>
                    <span className="ml-1.5 font-mono text-[11px] text-foreground break-all">
                      {server.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'ml-1.5 text-[10px] px-1.5 py-0 uppercase',
                        typeBadge.className
                      )}
                    >
                      {server.type === 'streamable-http' ? 'http' : server.type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={cn(
                        'ml-1.5',
                        server.enabled ? 'text-green-400' : 'text-gray-400'
                      )}
                    >
                      {server.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {server.connectionStatus && (
                    <div>
                      <span className="text-muted-foreground">Connection:</span>
                      <span className="ml-1.5 text-foreground">{server.connectionStatus}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-1.5 text-foreground">{formatDate(server.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="ml-1.5 text-foreground">{formatDate(server.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Actions</h4>
                <Separator />
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit Configuration
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => loadServer()}
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Refresh Status
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleRemove}
                    disabled={isRemoving}
                  >
                    {isRemoving ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                    )}
                    Remove Server
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <MCPServerForm
          server={server}
          onClose={handleEditClose}
        />
      )}
    </div>
  );
}
