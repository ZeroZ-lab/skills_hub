import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Plus,
  Download,
  Search,
  Filter,
  Server,
  List,
  LayoutList,
} from 'lucide-react';
import { useMCPStore, type MCPServer } from '@/stores/mcp';
import {
  useAgentsStore,
  getAgentDisplayName,
  getAgentColor,
  isUniversalAgent,
} from '@/stores/agents';
import { AgentMCPView } from '@/components/mcp/AgentMCPView';
import { MCPServerForm } from '@/components/mcp/MCPServerForm';
import { ImportMCPModal } from '@/components/mcp/ImportMCPModal';
import { MCPServerList } from '@/components/mcp/MCPServerList';

export default function MCPManager() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'servers' | 'agents'>('servers');
  const {
    servers,
    isLoading,
    error,
    selectedAgent,
    searchQuery,
    addModalOpen,
    editingServer,
    importModalOpen,
    fetchServers,
    removeServer,
    setSelectedAgent,
    setSearchQuery,
    setAddModalOpen,
    setEditingServer,
    setImportModalOpen,
  } = useMCPStore();

  const { agents, fetchAgents } = useAgentsStore();
  const installedAgents = agents.filter((a) => a.installed && a.config.supportsMcp);
  const universalAgents = installedAgents.filter((a) => isUniversalAgent(a.config.type));
  const universalServerCount = servers.filter((server) =>
    server.agents.some((binding) => isUniversalAgent(binding.agent))
  ).length;

  // Fetch data on mount
  useEffect(() => {
    fetchServers();
    fetchAgents();
  }, [fetchServers, fetchAgents]);

  // Filter servers by search query (client-side)
  const filteredServers = servers.filter((s) => {
    const matchesAgent =
      selectedAgent === 'all'
        ? true
        : selectedAgent === 'universal'
          ? s.agents.some((binding) => isUniversalAgent(binding.agent))
          : s.agents.some((binding) => binding.agent === selectedAgent);

    if (!matchesAgent) return false;

    const q = searchQuery.toLowerCase();
    if (!searchQuery.trim()) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      (s.config.command && s.config.command.toLowerCase().includes(q)) ||
      (s.config.url && s.config.url.toLowerCase().includes(q))
    );
  });

  const handleEdit = (server: MCPServer) => {
    setEditingServer(server);
  };

  const handleRemove = (id: string) => {
    removeServer(id);
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        title={t('pages.mcp.title')}
        description={t('pages.mcp.description')}
        actions={
          <>
            {/* View mode toggle */}
            <div className="flex items-center rounded-md border border-border p-0.5 gap-0.5">
              <Button
                variant={viewMode === 'servers' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                title="Servers 视图"
                onClick={() => setViewMode('servers')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'agents' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                title="Agents 视图"
                onClick={() => setViewMode('agents')}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('pages.mcp.actions.import')}
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('pages.mcp.actions.addServer')}
            </Button>
          </>
        }
      />

      {/* Filter bar — hidden in agents view */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-border px-8 py-3',
          viewMode === 'agents' && 'hidden'
        )}
      >
        {/* Agent filter */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="relative flex-1 min-w-0">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              <Button
                variant={selectedAgent === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs shrink-0"
                onClick={() => setSelectedAgent('all')}
              >
                {t('pages.mcp.filter.allAgents')}
              </Button>

              {universalAgents.length > 0 && (
                <Button
                  variant={selectedAgent === 'universal' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-7 px-2.5 text-xs gap-1.5 shrink-0',
                    selectedAgent === 'universal' && 'font-semibold'
                  )}
                  onClick={() => setSelectedAgent('universal')}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-4 px-1 text-[9px] leading-none',
                      getAgentColor('universal')
                    )}
                  >
                    {universalServerCount}
                  </Badge>
                  通用 Agents
                </Button>
              )}

              {installedAgents
                .filter((agent) => !isUniversalAgent(agent.config.type))
                .map((agent) => (
                  <Button
                    key={agent.config.type}
                    variant={selectedAgent === agent.config.type ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-7 px-2.5 text-xs gap-1.5 shrink-0',
                      selectedAgent === agent.config.type && 'font-semibold'
                    )}
                    onClick={() => setSelectedAgent(agent.config.type)}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-4 px-1 text-[9px] leading-none',
                        getAgentColor(agent.config.type)
                      )}
                    >
                      {agent.mcpCount}
                    </Badge>
                    {getAgentDisplayName(agent.config.type)}
                  </Button>
                ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64 shrink-0">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('pages.mcp.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Error state */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <span className="text-xs text-destructive-foreground">{error}</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-muted" />
                    <div className="h-3 w-64 rounded bg-muted" />
                    <div className="flex gap-2">
                      <div className="h-4 w-16 rounded-full bg-muted" />
                      <div className="h-4 w-20 rounded-full bg-muted" />
                      <div className="h-4 w-12 rounded-full bg-muted" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : servers.length === 0 && !searchQuery && selectedAgent === 'all' ? (
          /* Empty state (no servers at all) */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Server className="h-10 w-10 text-primary/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('pages.mcp.empty.title')}
            </h3>
            <p className="mb-6 max-w-md text-sm text-muted-foreground leading-relaxed">
              {t('pages.mcp.empty.description')}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setImportModalOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                {t('pages.mcp.empty.importButton')}
              </Button>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('pages.mcp.empty.addButton')}
              </Button>
            </div>
          </div>
        ) : filteredServers.length === 0 ? (
          /* No results for search/filter */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Server className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">{t('pages.mcp.noResults.title')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t('pages.mcp.noResults.description')}
            </p>
          </div>
        ) : viewMode === 'agents' ? (
          /* Agent-grouped view */
            <AgentMCPView
              servers={filteredServers}
              agents={installedAgents}
              onEdit={handleEdit}
              onRemove={handleRemove}
            />
        ) : (
          <MCPServerList
            servers={filteredServers}
            onEdit={handleEdit}
            onRemove={handleRemove}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      {addModalOpen && (
        <MCPServerForm
          server={editingServer}
          onClose={() => {
            setAddModalOpen(false);
            setEditingServer(null);
          }}
        />
      )}

      {/* Import Modal */}
      <ImportMCPModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  );
}
