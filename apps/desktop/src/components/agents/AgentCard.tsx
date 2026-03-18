import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Zap, Server, ChevronRight } from 'lucide-react';
import type { AgentStatus } from '@/stores/agents';
import { getAgentIcon } from '@/lib/agent-icons';

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  CLI: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-500' },
  IDE: { bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-500' },
  Web: { bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-500' },
  Desktop: { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-500' },
};

function getCategoryStyle(category: string) {
  return categoryColors[category] || categoryColors.CLI;
}

function getInitialColor(category: string) {
  const colors: Record<string, string> = {
    CLI: 'from-blue-600 to-blue-400',
    IDE: 'from-purple-600 to-purple-400',
    Web: 'from-green-600 to-green-400',
    Desktop: 'from-orange-600 to-orange-400',
  };
  return colors[category] || colors.CLI;
}

function truncatePath(path: string, maxLen = 35): string {
  if (path.length <= maxLen) return path;
  const parts = path.split('/');
  if (parts.length <= 3) return '...' + path.slice(-maxLen);
  return parts[0] + '/.../' + parts.slice(-2).join('/');
}

interface AgentCardProps {
  agent: AgentStatus;
  className?: string;
}

export function AgentCard({ agent, className }: AgentCardProps) {
  const navigate = useNavigate();
  const { config, installed, isOnline, skillCount, mcpCount } = agent;
  const catStyle = getCategoryStyle(config.category);
  const gradientColor = getInitialColor(config.category);
  const initial = config.displayName.charAt(0).toUpperCase();
  const skillsDir = config.globalSkillsDir || config.skillsDir;
  const IconComponent = getAgentIcon(config.type);

  const handleClick = () => {
    if (installed) {
      navigate(`/agents/${config.type}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative rounded-xl border border-border bg-card p-5 transition-all duration-200',
        installed && 'cursor-pointer hover:border-primary/30 hover:bg-card/80 hover:shadow-md',
        installed && 'ring-1 ring-primary/10',
        !installed && 'opacity-60',
        className
      )}
    >
      {/* Top row: Icon + Name + Status */}
      <div className="flex items-start gap-4">
        {/* Brand icon or initial circle */}
        {IconComponent ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/30 p-2">
            <IconComponent className="h-full w-full" style={{ color: 'currentColor' }} />
          </div>
        ) : (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-white shadow-lg',
              gradientColor
            )}
          >
            {initial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {config.displayName}
            </h3>
            {/* Status dot */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {installed && isOnline && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-40" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-2.5 w-2.5 rounded-full',
                  installed
                    ? isOnline
                      ? 'bg-green-500'
                      : 'bg-yellow-500'
                    : 'bg-gray-500'
                )}
              />
            </span>
          </div>

          {/* Category badge */}
          <div className="mt-1.5 flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                'border-0 text-[10px] font-semibold uppercase tracking-wider',
                catStyle.bg,
                catStyle.text
              )}
            >
              {config.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {installed ? (isOnline ? 'Online' : 'Installed') : 'Not found'}
            </span>
          </div>
        </div>

        {/* Arrow for installed agents */}
        {installed && (
          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Description */}
      {config.description && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {config.description}
        </p>
      )}

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">{skillCount}</span>
          <span>skills</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Server className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">{mcpCount}</span>
          <span>MCP</span>
        </div>
      </div>

      {/* Skills dir path */}
      {skillsDir && (
        <div className="mt-3 rounded-lg bg-secondary/50 px-3 py-1.5">
          <p
            className="truncate text-[11px] font-mono text-muted-foreground"
            title={skillsDir}
          >
            {truncatePath(skillsDir)}
          </p>
        </div>
      )}
    </div>
  );
}
