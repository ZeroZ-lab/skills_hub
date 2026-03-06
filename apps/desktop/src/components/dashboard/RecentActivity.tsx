import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Skill } from '@/stores/skills';
import { getAgentColor } from '@/stores/agents';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface RecentActivityProps {
  skills: Skill[];
  maxItems?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RecentActivity({ skills, maxItems = 8 }: RecentActivityProps) {
  const navigate = useNavigate();

  const sorted = [...skills]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxItems);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Clock className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Install your first skill to see activity here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <button
          onClick={() => navigate('/installed')}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="divide-y divide-border">
        {sorted.map((skill) => {
          const agents = skill.installs.map((i) => i.agent);
          const uniqueAgents = [...new Set(agents)];

          return (
            <button
              key={skill.name}
              onClick={() => navigate(`/installed/${encodeURIComponent(skill.name)}`)}
              className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-accent/50"
            >
              {/* Icon/indicator */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-xs font-bold text-primary">
                  {skill.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{skill.name}</span>
                  <span className="text-xs text-muted-foreground/60">installed</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  {uniqueAgents.slice(0, 3).map((agent) => (
                    <Badge
                      key={agent}
                      variant="outline"
                      className={cn('h-5 text-[10px] px-1.5', getAgentColor(agent))}
                    >
                      {agent}
                    </Badge>
                  ))}
                  {uniqueAgents.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{uniqueAgents.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Time */}
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(skill.updatedAt)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
