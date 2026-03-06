import { useState } from 'react';
import { ArrowDownAZ, ArrowUpDown, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MCPServerCard } from './MCPServerCard';
import type { MCPServer } from '@/stores/mcp';

type SortKey = 'name' | 'date' | 'agents';

interface MCPServerListProps {
  servers: MCPServer[];
  onEdit: (server: MCPServer) => void;
  onRemove: (id: string) => void;
}

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: 'name', label: 'Name', icon: ArrowDownAZ },
  { key: 'date', label: 'Updated', icon: Calendar },
  { key: 'agents', label: 'Agents', icon: Hash },
];

function sortServers(servers: MCPServer[], key: SortKey, asc: boolean): MCPServer[] {
  const sorted = [...servers].sort((a, b) => {
    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'date':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'agents':
        return b.agents.length - a.agents.length;
      default:
        return 0;
    }
  });
  return asc ? sorted : sorted.reverse();
}

export function MCPServerList({ servers, onEdit, onRemove }: MCPServerListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = sortServers(servers, sortKey, sortAsc);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-xs text-muted-foreground">Sort:</span>
        {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={sortKey === key ? 'secondary' : 'ghost'}
            size="sm"
            className={cn('h-7 gap-1 px-2 text-xs', sortKey === key && 'font-semibold')}
            onClick={() => {
              if (sortKey === key) {
                setSortAsc(!sortAsc);
              } else {
                setSortKey(key);
                setSortAsc(true);
              }
            }}
          >
            <Icon className="h-3 w-3" />
            {label}
            {sortKey === key && (
              <ArrowUpDown
                className={cn('h-3 w-3 transition-transform', !sortAsc && 'rotate-180')}
              />
            )}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {servers.length} server{servers.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((server) => (
          <MCPServerCard
            key={server.id}
            server={server}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
