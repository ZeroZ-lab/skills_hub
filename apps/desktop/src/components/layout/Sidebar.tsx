import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Package,
  Compass,
  Bot,
  Settings,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

interface NavItem {
  labelKey: string;
  groupKey?: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
}

const navItems: NavItem[] = [
  { labelKey: 'nav.dashboard', path: '/', icon: Home },
  { labelKey: 'nav.agents', path: '/agents', icon: Bot, groupKey: 'nav.group.assembly' },
  // Note: MCP management is now within Agent detail page, no standalone entry
  { labelKey: 'nav.skills', path: '/installed', icon: Package, groupKey: 'nav.group.assets' },
  { labelKey: 'nav.discover', path: '/discover', icon: Compass, groupKey: 'nav.group.assets' },
  { labelKey: 'nav.settings', path: '/settings', icon: Settings, groupKey: 'nav.group.system' },
];

export function Sidebar() {
  const { t } = useTranslation();
  let lastGroup: string | undefined;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">{/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Package className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold">{t('app.name')}</span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const showGroupLabel = item.groupKey && item.groupKey !== lastGroup;
          if (item.groupKey) lastGroup = item.groupKey;

          return (
            <div key={item.path}>
              {showGroupLabel && item.groupKey && (
                <p className="mb-2 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(item.groupKey)}
                </p>
              )}
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/15 text-primary border-r-2 border-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{t(item.labelKey)}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      <Separator />

      {/* Bottom actions */}
      <div className="space-y-3 px-3 py-3">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <Separator />

      {/* Status bar */}
      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground">v0.3.0</p>
      </div>
    </aside>
  );
}
