import { useState } from 'react';
import { ChevronDown, ChevronRight, FileJson, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MCPServerCard } from './MCPServerCard';
import type { MCPServer } from '@/stores/mcp';
import type { AgentStatus } from '@/stores/agents';
import { getAgentColor, getAgentDisplayName } from '@/stores/agents';

interface AgentMCPViewProps {
  servers: MCPServer[];
  agents: AgentStatus[];
  onEdit: (server: MCPServer) => void;
  onRemove: (id: string) => void;
}

interface AgentGroup {
  agentType: string;
  displayName: string;
  configs: ConfigGroup[];
  totalServers: number;
}

interface ConfigGroup {
  configPath: string;
  displayPath: string;
  servers: MCPServer[];
}

function formatConfigPath(configPath: string): string {
  if (!configPath) return 'Unknown config';

  const homePattern = /^\/Users\/[^/]+/;
  const linuxHomePattern = /^\/home\/[^/]+/;

  if (homePattern.test(configPath)) {
    return configPath.replace(homePattern, '~');
  }
  if (linuxHomePattern.test(configPath)) {
    return configPath.replace(linuxHomePattern, '~');
  }

  return configPath;
}

function buildAgentGroups(servers: MCPServer[], agents: AgentStatus[]): AgentGroup[] {
  // Collect all agent types that appear in server bindings
  const agentTypeSet = new Set<string>();
  for (const server of servers) {
    for (const binding of server.agents) {
      agentTypeSet.add(binding.agent);
    }
  }

  // Build ordered list: installed agents first (in registry order), then any extras
  const orderedTypes: string[] = [];
  for (const agent of agents) {
    if (agentTypeSet.has(agent.config.type)) {
      orderedTypes.push(agent.config.type);
      agentTypeSet.delete(agent.config.type);
    }
  }
  for (const t of agentTypeSet) {
    orderedTypes.push(t);
  }

  return orderedTypes.map((agentType) => {
    const agentServers = servers.filter((s) =>
      s.agents.some((binding) => binding.agent === agentType)
    );
    const configMap = new Map<string, MCPServer[]>();

    for (const server of agentServers) {
      const binding = server.agents.find((item) => item.agent === agentType);
      const configPath = formatConfigPath(binding?.configPath || '');
      if (!configMap.has(configPath)) {
        configMap.set(configPath, []);
      }
      configMap.get(configPath)!.push(server);
    }

    const configs: ConfigGroup[] = Array.from(configMap.entries())
      .map(([configPath, groupedServers]) => ({
        configPath,
        displayPath: configPath,
        servers: groupedServers,
      }))
      .sort((a, b) => a.configPath.localeCompare(b.configPath));

    return {
      agentType,
      displayName: getAgentDisplayName(agentType),
      configs,
      totalServers: agentServers.length,
    };
  });
}

function ConfigSection({
  config,
  onEdit,
  onRemove,
  defaultOpen,
}: {
  config: ConfigGroup;
  onEdit: (server: MCPServer) => void;
  onRemove: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <FileJson className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-xs font-mono text-muted-foreground">{config.displayPath}</span>
        <Badge
          variant="secondary"
          className="ml-auto shrink-0 text-[9px] px-1 py-0"
        >
          {config.servers.length}
        </Badge>
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-border/50 p-2">
          {config.servers.map((server) => (
            <MCPServerCard
              key={server.id}
              server={server}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentSection({
  group,
  onEdit,
  onRemove,
  defaultOpen,
}: {
  group: AgentGroup;
  onEdit: (server: MCPServer) => void;
  onRemove: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colorClass = getAgentColor(group.agentType);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Section header */}
      <button
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0 shrink-0', colorClass)}
        >
          {group.agentType}
        </Badge>
        <span className="text-sm font-semibold text-foreground">{group.displayName}</span>
        <Badge
          variant="secondary"
          className="ml-auto shrink-0 text-[10px] px-1.5 py-0"
        >
          {group.totalServers} server{group.totalServers !== 1 ? 's' : ''}
        </Badge>
      </button>

      {/* Config groups */}
      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-3">
          {group.configs.map((config, i) => (
            <ConfigSection
              key={config.configPath}
              config={config}
              onEdit={onEdit}
              onRemove={onRemove}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentMCPView({
  servers,
  agents,
  onEdit,
  onRemove,
}: AgentMCPViewProps) {
  const groups = buildAgentGroups(servers, agents);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Server className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No agents with MCP servers</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Add MCP servers and assign them to agents to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs text-muted-foreground ml-auto">
        {groups.length} agent{groups.length !== 1 ? 's' : ''}
      </span>
      {groups.map((group, i) => (
        <AgentSection
          key={group.agentType}
          group={group}
          onEdit={onEdit}
          onRemove={onRemove}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
