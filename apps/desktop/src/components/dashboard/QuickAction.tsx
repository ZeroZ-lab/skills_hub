import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Props ──────────────────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'primary';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuickAction({ label, icon: Icon, onClick, variant = 'default' }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-1 items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-all',
        variant === 'primary'
          ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50'
          : 'border-border bg-card text-foreground hover:bg-accent hover:border-border/80'
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          variant === 'primary'
            ? 'text-primary'
            : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      <span className="truncate">{label}</span>
    </button>
  );
}
