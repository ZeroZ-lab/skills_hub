import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  GitBranch,
  HardDrive,
  MoreVertical,
  RefreshCw,
  Trash2,
  ExternalLink,
  Tag,
  User,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Skill, UpdateCheckResult } from '@/stores/skills';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AddToAgentsModal } from './AddToAgentsModal';

interface SkillCardProps {
  skill: Skill;
  updateInfo?: UpdateCheckResult;
  onRemove: (name: string) => void;
  onUpdate: (name: string) => void;
  onAddToAgents?: () => void;
}

const SOURCE_BADGE_STYLES: Record<string, string> = {
  github: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  local: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  url: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
};

export function SkillCard({
  skill,
  updateInfo,
  onRemove,
  onUpdate,
  onAddToAgents,
}: SkillCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddToAgents, setShowAddToAgents] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const assemblyCount = skill.installs.length;

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

  const hasUpdate = updateInfo?.hasUpdate ?? false;

  return (
    <div
      className={cn(
        'group relative flex items-start gap-4 rounded-xl border border-border bg-card p-4',
        'transition-all duration-150 hover:border-primary/30 hover:bg-accent/50 cursor-pointer'
      )}
      onClick={() => navigate(`/installed/${encodeURIComponent(skill.name)}`)}
    >
      {/* Left: icon placeholder */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <GitBranch className="h-5 w-5" />
      </div>

      {/* Center: content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Name + version */}
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{skill.name}</h3>
          {skill.version && (
            <Badge variant="outline" className="shrink-0 text-[10px] font-mono px-1.5 py-0">
              v{skill.version}
            </Badge>
          )}
          {hasUpdate && updateInfo && (
            <Badge className="shrink-0 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 gap-1">
              {updateInfo.currentVersion && updateInfo.latestVersion ? (
                <>
                  v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                </>
              ) : (
                'Update'
              )}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {skill.description || 'No description'}
        </p>

        {/* Meta row */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {/* Source badge */}
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0',
              SOURCE_BADGE_STYLES[skill.source.type] || SOURCE_BADGE_STYLES.url
            )}
          >
            {skill.source.type === 'github' ? (
              <GitBranch className="mr-1 h-3 w-3" />
            ) : (
              <HardDrive className="mr-1 h-3 w-3" />
            )}
            {skill.source.type}
          </Badge>

          {/* Author */}
          {skill.author && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />
              {skill.author}
            </span>
          )}

          {/* Tags */}
          {skill.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              <Tag className="mr-0.5 h-2.5 w-2.5" />
              {tag}
            </Badge>
          ))}
          {skill.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{skill.tags.length - 3}</span>
          )}
        </div>

        {/* Assembly summary */}
        {assemblyCount > 0 && (
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Boxes className="h-3.5 w-3.5" />
            <span>
              Assembled to {assemblyCount} target{assemblyCount === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {/* Right: actions */}
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
                navigate(`/installed/${encodeURIComponent(skill.name)}`);
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
                setShowAddToAgents(true);
                setMenuOpen(false);
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t('common.addToAgents')}
            </button>
            {hasUpdate && (
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(skill.name);
                  setMenuOpen(false);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Update
              </button>
            )}
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(skill.name);
                setMenuOpen(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Add to Agents Modal */}
      {showAddToAgents && (
        <AddToAgentsModal
          skill={skill}
          onClose={() => setShowAddToAgents(false)}
          onSuccess={() => {
            onAddToAgents?.();
          }}
        />
      )}
    </div>
  );
}
