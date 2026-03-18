import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/stores/agents';
import { getAgentDisplayName, AGENT_COLORS } from '@/stores/agents';
import { getAgentIcon } from '@/lib/agent-icons';

// ─── Color helpers for initials ─────────────────────────────────────────────

const INITIAL_COLORS: Record<string, string> = {
  'claude-code': 'bg-orange-500/20 text-orange-400',
  codex: 'bg-indigo-500/20 text-indigo-400',
  'gemini-cli': 'bg-blue-500/20 text-blue-400',
  openclaw: 'bg-rose-500/20 text-rose-400',
  opencode: 'bg-emerald-500/20 text-emerald-400',
};

function getInitialColor(agentType: string): string {
  return INITIAL_COLORS[agentType.toLowerCase()] || 'bg-gray-500/20 text-gray-400';
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface AgentStatusListProps {
  agents: AgentStatus[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AgentStatusList({ agents }: AgentStatusListProps) {
  const navigate = useNavigate();

  const installedAgents = agents.filter((a) => a.installed);

  if (installedAgents.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-foreground">Agent Status</h3>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Bot className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No agents detected</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Run agent detection to find installed agents
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-sm font-semibold text-foreground">Agent Status</h3>
        <button
          onClick={() => navigate('/agents')}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="divide-y divide-border">
        {installedAgents.map((agent) => {
          const agentType = agent.config.type;
          const displayName = getAgentDisplayName(agentType);
          const agentColor = AGENT_COLORS[agentType.toLowerCase()] || AGENT_COLORS.default;
          const IconComponent = getAgentIcon(agentType);

          return (
            <button
              key={agentType}
              onClick={() => navigate('/agents')}
              className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-accent/50"
            >
              {/* Brand icon or colored initial */}
              {IconComponent ? (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/30 p-1.5">
                  <IconComponent className="h-full w-full" style={{ color: 'currentColor' }} />
                </div>
              ) : (
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    getInitialColor(agentType)
                  )}
                >
                  {displayName.charAt(0)}
                </div>
              )}

              {/* Name and status */}
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {agent.skillCount} skill{agent.skillCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Status dot */}
              <div className="flex items-center gap-2">
                {agent.skillCount > 0 && (
                  <Badge
                    variant="outline"
                    className={cn('h-5 text-[10px] px-1.5', agentColor)}
                  >
                    {agent.skillCount}
                  </Badge>
                )}
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    agent.isOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]' : 'bg-gray-500'
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
