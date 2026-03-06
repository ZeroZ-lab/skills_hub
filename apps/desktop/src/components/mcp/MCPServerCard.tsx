import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Terminal,
  Globe,
  Radio,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { MCPServer } from '@/stores/mcp';
import { useMCPStore } from '@/stores/mcp';
import { getAgentColor, getAgentDisplayName } from '@/stores/agents';

interface MCPServerCardProps {
  server: MCPServer;
  onEdit: (server: MCPServer) => void;
  onRemove: (id: string) => void;
}

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

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getTypeLabel(type: string): string {
  if (type === 'streamable-http') return 'http';
  return type;
}

export function MCPServerCard({ server, onEdit, onRemove }: MCPServerCardProps) {
  const navigate = useNavigate();
  const { toggleAgent } = useMCPStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const typeBadge = TYPE_BADGE_STYLES[server.type] || TYPE_BADGE_STYLES.stdio;
  const TypeIcon = typeBadge.icon;

  const configPreview =
    server.type === 'stdio'
      ? [server.config.command, ...(server.config.args || [])].filter(Boolean).join(' ')
      : server.config.url || '';

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-border bg-card p-5',
        'transition-all duration-150 hover:border-primary/30 hover:bg-accent/50 cursor-pointer'
      )}
      onClick={() => navigate(`/mcp/${encodeURIComponent(server.id)}`)}
    >
      <div className="flex items-start gap-4">
        {/* Left: Icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            server.type === 'stdio'
              ? 'bg-blue-500/10 text-blue-400'
              : server.type === 'sse'
                ? 'bg-purple-500/10 text-purple-400'
                : 'bg-green-500/10 text-green-400'
          )}
        >
          <TypeIcon className="h-5 w-5" />
        </div>

        {/* Center: Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Name + Type Badge */}
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {server.name}
            </h3>
            <Badge
              variant="outline"
              className={cn('shrink-0 text-[10px] px-1.5 py-0 uppercase', typeBadge.className)}
            >
              {getTypeLabel(server.type)}
            </Badge>
            {!server.enabled && (
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] px-1.5 py-0 bg-gray-500/15 text-gray-400 border-gray-500/25"
              >
                Disabled
              </Badge>
            )}
          </div>

          {/* Config preview */}
          {configPreview && (
            <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
              <code className="text-[11px] font-mono text-muted-foreground break-all line-clamp-2">
                {configPreview}
              </code>
            </div>
          )}

          {/* Agent bindings */}
          {server.agents.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Agent Bindings
              </span>
              <div className="flex flex-wrap gap-2">
                {server.agents.map((binding) => (
                  <div
                    key={binding.agent}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        SYNC_STATUS_COLORS[binding.syncStatus] || 'bg-gray-500'
                      )}
                      title={`Sync: ${binding.syncStatus}`}
                    />
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] px-1.5 py-0', getAgentColor(binding.agent))}
                    >
                      {getAgentDisplayName(binding.agent)}
                    </Badge>
                    <Switch
                      checked={binding.enabled}
                      onCheckedChange={(checked) => {
                        toggleAgent(server.id, binding.agent, checked);
                      }}
                      className="h-4 w-8 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4"
                    />
                    {binding.lastSyncedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(binding.lastSyncedAt)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="relative shrink-0" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {menuOpen && (
            <div
              className={cn(
                'absolute right-0 top-8 z-50 w-44 rounded-lg border border-border bg-popover p-1 shadow-xl',
                'animate-in fade-in-0 zoom-in-95'
              )}
            >
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/mcp/${encodeURIComponent(server.id)}`);
                  setMenuOpen(false);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Detail
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(server);
                  setMenuOpen(false);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-destructive-foreground hover:bg-destructive/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(server.id);
                  setMenuOpen(false);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
