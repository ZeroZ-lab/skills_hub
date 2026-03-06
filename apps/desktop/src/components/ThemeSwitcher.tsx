import { Sun, Moon, Monitor } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { useTheme, type Theme } from '@/hooks/useTheme';

const themes: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '系统', icon: Monitor },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as Theme);
  };

  const currentTheme = themes.find((t) => t.value === theme) || themes[2];
  const Icon = currentTheme.icon;

  return (
    <div className="flex w-full items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Select
        className="h-8 text-xs"
        options={themes.map((t) => ({ value: t.value, label: t.label }))}
        value={theme}
        onChange={handleChange}
      />
    </div>
  );
}
