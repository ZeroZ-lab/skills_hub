import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Terminal, Globe, Radio, Server, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMCPStore, type RawMCPServer } from '@/stores/mcp';
import { useAgentsStore, type AgentStatus } from '@/stores/agents';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  stdio: Terminal,
  sse: Radio,
  http: Globe,
  'streamable-http': Globe,
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  stdio: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  sse: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  http: 'bg-green-500/15 text-green-400 border-green-500/25',
  'streamable-http': 'bg-green-500/15 text-green-400 border-green-500/25',
};

// ─── Connection Status Dot ───────────────────────────────────────────────────

function StatusDot({ status, title }: { status: string | null; title: string }) {
  const color =
    status === 'connected'
      ? 'bg-green-500'
      : status === 'error'
        ? 'bg-red-500'
        : 'bg-muted-foreground/40';
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', color)}
      title={title}
    />
  );
}

// ─── Server Row (read-only) ──────────────────────────────────────────────────

function MCPServerRow({ server }: { server: RawMCPServer }) {
  const { t } = useTranslation();
  const TypeIcon = TYPE_ICONS[server.type] ?? Terminal;

  const configPreview =
    server.type === 'stdio'
      ? [server.config.command, ...(server.config.args ?? [])].filter(Boolean).join(' ')
      : server.config.url ?? '';

  const statusKey = server.connectionStatus ?? 'disconnected';
  const statusTitle = t(`pages.mcp.status.${statusKey}`, statusKey);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5',
        !server.enabled && 'opacity-50'
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          server.type === 'stdio'
            ? 'bg-blue-500/10 text-blue-400'
            : server.type === 'sse'
              ? 'bg-purple-500/10 text-purple-400'
              : 'bg-green-500/10 text-green-400'
        )}
      >
        <TypeIcon className="h-3.5 w-3.5" />
      </div>

      {/* Name + config preview */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{server.name}</span>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 px-1.5 py-0 text-[9px] uppercase',
              TYPE_BADGE_STYLES[server.type]
            )}
          >
            {server.type === 'streamable-http' ? 'http' : server.type}
          </Badge>
        </div>
        {configPreview && (
          <code className="block truncate text-[10px] font-mono text-muted-foreground">
            {configPreview}
          </code>
        )}
      </div>

      {/* Status dot */}
      <StatusDot status={server.connectionStatus} title={statusTitle} />
    </div>
  );
}

// ─── Agent Group ─────────────────────────────────────────────────────────────

function AgentGroup({
  agent,
  servers,
}: {
  agent: AgentStatus;
  servers: RawMCPServer[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {agent.config.displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            ({servers.length} {t('pages.agents.card.mcp', 'MCP')})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/agents/${agent.config.type}`)}
        >
          {t('common.details', 'Details')}
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>

      {/* Server list or empty state */}
      {servers.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-2">
          {t('pages.mcp.empty.description', 'No MCP servers configured')}
        </p>
      ) : (
        <div className="space-y-1.5">
          {servers.map((server) => (
            <MCPServerRow key={server.id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MCPGlobalView ───────────────────────────────────────────────────────────

export function MCPGlobalView() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const allServers = useMCPStore((s) => s.allServers);
  const isLoadingAll = useMCPStore((s) => s.isLoadingAll);
  const loadAllError = useMCPStore((s) => s.loadAllError);
  const fetchAllServers = useMCPStore((s) => s.fetchAllServers);

  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  useEffect(() => {
    void fetchAllServers();
    if (agents.length === 0) {
      void fetchAgents();
    }
  }, [fetchAllServers, fetchAgents, agents.length]);

  // Build agent-centric grouped view (only MCP-capable agents)
  const mcpAgents = agents.filter((a) => a.config.supportsMcp);

  const grouped = mcpAgents.map((agentInfo) => ({
    agent: agentInfo,
    servers: allServers.filter((s) =>
      s.agents.some((b) => b.agent === agentInfo.config.type)
    ),
  }));

  // ── Loading state ──
  if (isLoadingAll) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error state ──
  if (loadAllError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
        <p className="text-sm text-destructive">{loadAllError}</p>
        <Button variant="outline" size="sm" onClick={() => void fetchAllServers()}>
          {t('common.retry', 'Retry')}
        </Button>
      </div>
    );
  }

  // ── Empty state (all agents have 0 servers) ──
  const totalServers = grouped.reduce((sum, g) => sum + g.servers.length, 0);
  if (totalServers === 0 && !isLoadingAll) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
        <Server className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-sm font-medium mb-1">
            {t('pages.mcp.empty.title', 'No MCP assets yet')}
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            {t('pages.mcp.empty.description', 'Configure MCP servers from the Agent detail page.')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/agents')}>
          {t('nav.agents', 'Agent Assembly')}
        </Button>
      </div>
    );
  }

  // ── Grouped list ──
  return (
    <div className="space-y-4">
      {grouped.map(({ agent, servers }) => (
        <AgentGroup key={agent.config.type} agent={agent} servers={servers} />
      ))}
    </div>
  );
}
