import { ExternalLink, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DiscoveredSkill } from '@/stores/discover';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatInstalls(installs: number): string {
  if (installs >= 1000000) {
    return `${(installs / 1000000).toFixed(1)}M`;
  }
  if (installs >= 1000) {
    return `${(installs / 1000).toFixed(1)}K`;
  }
  return String(installs);
}

function isNewSkill(createdAt?: string): boolean {
  if (!createdAt) return false;

  try {
    const created = new Date(createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 14; // 14 天内算新技能
  } catch {
    return false;
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  React: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'UI/UX': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Mobile: 'bg-green-500/10 text-green-400 border-green-500/20',
  Utility: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Code Quality': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  DevOps: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Testing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Debugging: 'bg-red-500/10 text-red-400 border-red-500/20',
  Documentation: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Security: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Performance: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  API: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  TypeScript: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Database: 'bg-green-500/10 text-green-400 border-green-500/20',
  CSS: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface SkillDiscoveryCardProps {
  skill: DiscoveredSkill;
  onInstall: (source: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SkillDiscoveryCard({ skill, onInstall }: SkillDiscoveryCardProps) {
  const categoryColor = skill.category
    ? CATEGORY_COLORS[skill.category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    : 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  // Extract author from source (e.g., "vercel-labs/agent-skills" -> "vercel-labs")
  const author = skill.source.split('/')[0] || 'unknown';
  const isNew = isNewSkill(skill.created_at);

  return (
    <div
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card p-6',
        'transition-all duration-200',
        'hover:border-border/80 hover:shadow-lg hover:shadow-black/20'
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {skill.name}
            </h3>
            {isNew && (
              <Badge
                variant="outline"
                className="shrink-0 gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400"
              >
                <Sparkles className="h-2.5 w-2.5" />
                NEW
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            by <span className="text-foreground/70">{author}</span>
          </p>
        </div>

        {/* Installs */}
        {skill.installs > 0 && (
          <div className="ml-3 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>{formatInstalls(skill.installs)}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {skill.description && (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {skill.description}
        </p>
      )}

      {/* Category + Tags */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {skill.category && (
          <Badge variant="outline" className={cn('text-[10px]', categoryColor)}>
            {skill.category}
          </Badge>
        )}
        {skill.tags?.slice(0, 3).map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="border-border/50 text-[10px] text-muted-foreground"
          >
            {tag}
          </Badge>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onInstall(skill.install_source)}
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            const url = skill.source.startsWith('http')
              ? skill.source
              : `https://github.com/${skill.source}`;
            window.open(url, '_blank');
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Source
        </Button>
      </div>
    </div>
  );
}
