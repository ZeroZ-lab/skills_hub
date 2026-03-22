import { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { SkillDiscoveryCard } from '@/components/discover/SkillDiscoveryCard';
import { MCPDiscoveryCard } from '@/components/discover/MCPDiscoveryCard';
import { useDiscoverStore } from '@/stores/discover';
import { useSkillsStore } from '@/stores/skills';
import { useMCPStore } from '@/stores/mcp';

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Discover() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'skills' | 'mcp'>('skills');

  const {
    skillResults,
    mcpResults,
    isLoading,
    error,
    searchQuery,
    skillsFetch,
    mcpFetch,
    searchSkills,
    loadFeaturedSkills,
    searchMcpServers,
    loadFeaturedMcpServers,
    setSearchQuery,
  } = useDiscoverStore();

  const setAddModalOpen = useMCPStore((state) => state.setAddModalOpen);
  const activeResults = activeTab === 'skills' ? skillResults : mcpResults;
  const activeFetch = activeTab === 'skills' ? skillsFetch : mcpFetch;

  useEffect(() => {
    if (activeTab === 'skills') {
      loadFeaturedSkills();
      return;
    }
    loadFeaturedMcpServers();
  }, [activeTab, loadFeaturedMcpServers, loadFeaturedSkills]);

  const handleSearch = useCallback(() => {
    if (inputValue.trim()) {
      setSearchQuery(inputValue);
      if (activeTab === 'skills') {
        searchSkills(inputValue);
      } else {
        searchMcpServers(inputValue);
      }
    } else {
      setSearchQuery('');
      if (activeTab === 'skills') {
        loadFeaturedSkills();
      } else {
        loadFeaturedMcpServers();
      }
    }
  }, [
    activeTab,
    inputValue,
    loadFeaturedMcpServers,
    loadFeaturedSkills,
    searchMcpServers,
    searchSkills,
    setSearchQuery,
  ]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleInstall = useCallback(
    (source: string) => {
      // Navigate to installed page and pre-fill the install modal source
      useSkillsStore.getState().setInstallSource(source);
      useSkillsStore.getState().setInstallModalOpen(true);
      navigate('/installed');
    },
    [navigate]
  );

  const handleAddMcp = useCallback(() => {
    setAddModalOpen(true);
    navigate('/mcp');
  }, [navigate, setAddModalOpen]);

  const handleManualRefresh = useCallback(() => {
    if (activeTab === 'skills') {
      if (searchQuery.trim()) {
        searchSkills(searchQuery);
      } else {
        loadFeaturedSkills();
      }
      return;
    }

    if (searchQuery.trim()) {
      searchMcpServers(searchQuery);
    } else {
      loadFeaturedMcpServers();
    }
  }, [
    activeTab,
    loadFeaturedMcpServers,
    loadFeaturedSkills,
    searchMcpServers,
    searchQuery,
    searchSkills,
  ]);

  const lastRefreshText = activeFetch.fetchedAt
    ? new Date(activeFetch.fetchedAt * 1000).toLocaleString()
    : 'Never';

  return (
    <div className="flex h-full flex-col">
      <Header title={t('pages.discover.title')} description={t('pages.discover.description')} />

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border px-8 pb-4 pt-6">
          <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
            <Button
              variant={activeTab === 'skills' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setActiveTab('skills')}
            >
              Skills
            </Button>
            <Button
              variant={activeTab === 'mcp' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setActiveTab('mcp')}
            >
              MCP Servers
            </Button>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {activeFetch.cacheHit ? 'Cached' : 'Live'}
            </Badge>
            {activeFetch.refreshing && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                Refreshing in background
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">Updated: {lastRefreshText}</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-7 px-2 text-xs"
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('pages.discover.searchPlaceholder')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="mr-2 h-4 w-4" />
              {t('common.search')}
            </Button>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('pages.discover.searching')}</p>
            </div>
          )}

          {!isLoading && activeResults.length === 0 && searchQuery.trim() && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="mb-4 h-10 w-10 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground">
                {t('pages.discover.noResults')}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {t('pages.discover.noResultsDesc', { query: searchQuery })}
              </p>
              <button
                onClick={() => {
                  setInputValue('');
                  setSearchQuery('');
                  if (activeTab === 'skills') {
                    loadFeaturedSkills();
                  } else {
                    loadFeaturedMcpServers();
                  }
                }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                {t('pages.discover.clearSearch')}
              </button>
            </div>
          )}

          {!isLoading && activeResults.length === 0 && !searchQuery.trim() && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Sparkles className="mb-4 h-10 w-10 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold text-foreground">
                {activeTab === 'skills'
                  ? t('pages.discover.discoverSkills')
                  : 'Discover MCP Servers'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {activeTab === 'skills'
                  ? t('pages.discover.loadingDesc')
                  : 'Browse community MCP servers and add them to your workspace.'}
              </p>
            </div>
          )}

          {!isLoading && activeResults.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {activeTab === 'skills'
                ? skillResults.map((skill) => (
                    <SkillDiscoveryCard key={skill.id} skill={skill} onInstall={handleInstall} />
                  ))
                : mcpResults.map((server) => (
                    <MCPDiscoveryCard key={server.id} server={server} onAdd={handleAddMcp} />
                  ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
