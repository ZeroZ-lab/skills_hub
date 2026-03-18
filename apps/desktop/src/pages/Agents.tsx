import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentCard } from '@/components/agents/AgentCard';
import { useAgentsStore } from '@/stores/agents';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  Search,
  AlertCircle,
  Bot,
} from 'lucide-react';

export default function Agents() {
  const { t } = useTranslation();
  const {
    agents,
    isLoading,
    isDetecting,
    error,
    filter,
    searchQuery,
    fetchAgents,
    detectAgents,
    setFilter,
    setSearchQuery,
  } = useAgentsStore();

  const filterOptions = [
    { value: 'all', label: t('pages.agents.filter.all') },
    { value: 'installed', label: t('pages.agents.filter.installed') },
    { value: 'universal', label: 'Shared Skills' },
    { value: 'non-universal', label: 'Agent-Specific' },
  ];

  function AgentCardSkeleton() {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded bg-secondary" />
            <div className="h-3 w-16 rounded bg-secondary" />
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <div className="h-3 w-16 rounded bg-secondary" />
          <div className="h-3 w-16 rounded bg-secondary" />
        </div>
        <div className="mt-3 h-7 rounded-lg bg-secondary/50" />
      </div>
    );
  }

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = useMemo(() => {
    let result = [...agents];

    // Apply filter
    if (filter === 'installed') {
      result = result.filter((a) => a.installed);
    } else if (filter !== 'all') {
      result = result.filter(
        (a) => a.config.category.toLowerCase() === filter.toLowerCase()
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.config.displayName.toLowerCase().includes(q) ||
          a.config.type.toLowerCase().includes(q) ||
          a.config.category.toLowerCase().includes(q)
      );
    }

    // Sort: installed agents first
    result.sort((a, b) => {
      if (a.installed && !b.installed) return -1;
      if (!a.installed && b.installed) return 1;
      return a.config.displayName.localeCompare(b.config.displayName);
    });

    return result;
  }, [agents, filter, searchQuery]);

  const installedCount = agents.filter((a) => a.installed).length;
  const totalCount = agents.length;

  return (
    <div className="flex h-full flex-col">
      <Header
        title={t('pages.agents.title')}
        description={t('pages.agents.description')}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={detectAgents}
            disabled={isDetecting}
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', isDetecting && 'animate-spin')}
            />
            {isDetecting ? t('pages.agents.detecting') : t('pages.agents.reDetect')}
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats summary */}
        {!isLoading && agents.length > 0 && (
          <div className="mb-6 flex items-center gap-6 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{totalCount}</span>{' '}
              {t('pages.agents.stats.total')}
            </span>
            <span>
              <span className="font-semibold text-green-400">{installedCount}</span>{' '}
              {t('pages.agents.stats.installed')}
            </span>
          </div>
        )}

        {/* Filter bar + Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
                  filter === opt.value
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('pages.agents.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <AgentCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Agent grid */}
        {!isLoading && filteredAgents.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.config.type} agent={agent} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredAgents.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {agents.length === 0 ? t('pages.agents.empty.noAgents') : t('pages.agents.empty.noMatching')}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {agents.length === 0
                ? t('pages.agents.empty.noAgentsDesc')
                : t('pages.agents.empty.noMatchingDesc')}
            </p>
            {agents.length === 0 && (
              <Button
                className="mt-4"
                size="sm"
                onClick={detectAgents}
                disabled={isDetecting}
              >
                <RefreshCw
                  className={cn('mr-2 h-4 w-4', isDetecting && 'animate-spin')}
                />
                {t('pages.agents.detectAgents')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
