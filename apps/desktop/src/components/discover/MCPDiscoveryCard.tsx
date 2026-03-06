import { ExternalLink, Server, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DiscoveredMCPServer } from '@/stores/discover';

interface MCPDiscoveryCardProps {
  server: DiscoveredMCPServer;
  onAdd: (server: DiscoveredMCPServer) => void;
}

function formatStars(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

export function MCPDiscoveryCard({ server, onAdd }: MCPDiscoveryCardProps) {
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-border/80 hover:shadow-lg hover:shadow-black/20">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h3 className="truncate text-base font-semibold text-foreground">{server.name}</h3>
          </div>
          {server.author && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              by <span className="text-foreground/70">{server.author}</span>
            </p>
          )}
        </div>

        {(server.stars ?? server.installs) > 0 && (
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            <span>{formatStars(server.stars ?? server.installs)}</span>
          </div>
        )}
      </div>

      {server.description && (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {server.description}
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className="text-[10px] border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
        >
          MCP
        </Badge>
        <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
          GitHub
        </Badge>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={() => onAdd(server)}>
          Add to MCP
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => window.open(server.source, '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Source
        </Button>
      </div>
    </div>
  );
}
