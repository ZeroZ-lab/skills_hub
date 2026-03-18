import { useEffect } from 'react';
import {
  Server,
  Plus,
  Terminal,
  Globe,
  Radio,
  Trash2,
  Pencil,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useMCPStore, type AgentMCPServer } from '@/stores/mcp';
import type { AgentStatus } from '@/stores/agents';

interface AgentMCPPanelProps {
  agent: AgentStatus;
  isExpanded: boolean;
  onToggle: () => void;
}

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

function MCPServerItem({
  server,
  onRemove,
  onToggleEnabled,
}: {
  server: AgentMCPServer;
  onRemove: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}) {
  const TypeIcon = TYPE_ICONS[server.type] || Terminal;

  const configPreview =
    server.type === 'stdio'
      ? [server.config.command, ...(server.config.args || [])].filter(Boolean).join(' ')
      : server.config.url || '';

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border bg-card/50 p-3',
        'transition-all duration-150 hover:border-primary/30',
        !server.enabled && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
            server.type === 'stdio'
              ? 'bg-blue-500/10 text-blue-400'
              : server.type === 'sse'
                ? 'bg-purple-500/10 text-purple-400'
                : 'bg-green-500/10 text-green-400'
          )}
        >
          <TypeIcon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-medium text-foreground">
              {server.name}
            </h4>
            <Badge
              variant="outline"
              className={cn('shrink-0 text-[9px] px-1.5 py-0 uppercase', TYPE_BADGE_STYLES[server.type])}
            >
              {server.type === 'streamable-http' ? 'http' : server.type}
            </Badge>
          </div>

          {configPreview && (
            <code className="truncate text-[10px] font-mono text-muted-foreground">
              {configPreview}
            </code>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Switch
            checked={server.enabled}
            onCheckedChange={(checked) => onToggleEnabled(server.id, checked)}
            className="h-3.5 w-7 [&>span]:h-2.5 [&>span]:w-2.5 [&>span]:data-[state=checked]:translate-x-3.5"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => alert('Edit functionality coming soon')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={() => onRemove(server.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AgentMCPPanel({ agent, isExpanded, onToggle }: AgentMCPPanelProps) {
  const { config, installed, mcpCount } = agent;
  const {
    agentServers,
    isLoading,
    fetchAgentServers,
    removeAgentServer,
    toggleAgentServer,
  } = useMCPStore();

  const servers = agentServers.get(config.type) || [];

  useEffect(() => {
    if (isExpanded && installed) {
      void fetchAgentServers(config.type);
    }
  }, [isExpanded, installed, config.type, fetchAgentServers]);

  const handleRemove = async (id: string) => {
    if (confirm('Are you sure you want to remove this MCP server?')) {
      await removeAgentServer(config.type, id);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleAgentServer(config.type, id, enabled);
  };

  if (!installed || !config.supportsMcp) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">MCP Servers</span>
          <Badge variant="secondary" className="text-[10px]">
            {mcpCount}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : servers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/20 py-4 text-center">
              <p className="text-xs text-muted-foreground">No MCP servers configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {servers.map((server) => (
                <MCPServerItem
                  key={server.id}
                  server={server}
                  onRemove={handleRemove}
                  onToggleEnabled={handleToggle}
                />
              ))}
            </div>
          )}

          {/* Add Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => alert('Add MCP Server functionality coming soon')}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add MCP Server
          </Button>
        </div>
      )}
    </div>
  );
}
