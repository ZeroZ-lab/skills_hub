import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Color Maps ─────────────────────────────────────────────────────────────

const ACCENT_COLORS: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  amber: 'from-amber-500 to-amber-600',
  emerald: 'from-emerald-500 to-emerald-600',
};

const ICON_COLORS: Record<string, string> = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  purple: 'text-purple-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
};

const ICON_BG_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/10',
  green: 'bg-green-500/10',
  purple: 'bg-purple-500/10',
  amber: 'bg-amber-500/10',
  emerald: 'bg-emerald-500/10',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'emerald';
  trend?: string;
  description?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function StatCard({ title, value, icon: Icon, color, trend, description }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
      {/* Left accent bar */}
      <div
        className={cn(
          'absolute left-0 top-0 h-full w-1 bg-gradient-to-b',
          ACCENT_COLORS[color]
        )}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground">{trend}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        <div className={cn('rounded-lg p-2.5', ICON_BG_COLORS[color])}>
          <Icon className={cn('h-5 w-5', ICON_COLORS[color])} />
        </div>
      </div>
    </div>
  );
}
