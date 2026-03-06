import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settings';

export type Theme = 'light' | 'dark' | 'system';

function getResolvedTheme(theme: Theme) {
  if (theme !== 'system') return theme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const root = window.document.documentElement;

  root.classList.remove('light', 'dark');
  root.classList.add(getResolvedTheme(theme));
}

export function useTheme() {
  const config = useSettingsStore((state) => state.config);
  const fetchConfig = useSettingsStore((state) => state.fetchConfig);
  const updateConfig = useSettingsStore((state) => state.updateConfig);
  const storeTheme = (config?.theme || 'system') as Theme;
  const [optimisticTheme, setOptimisticTheme] = useState<Theme | null>(null);
  const theme = optimisticTheme ?? storeTheme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    const previousTheme = theme;

    setOptimisticTheme(newTheme);
    applyTheme(newTheme);

    let isSaved = await updateConfig({ theme: newTheme });

    if (!isSaved) {
      await fetchConfig();
      isSaved = await updateConfig({ theme: newTheme });
    }

    if (!isSaved) {
      setOptimisticTheme(null);
      applyTheme(previousTheme);
      return;
    }

    setOptimisticTheme(null);
  };

  return { theme, setTheme };
}
