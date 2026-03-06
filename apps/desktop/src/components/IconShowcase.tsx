import { AGENT_ICON_MAP } from '@/lib/agent-icons';

export function IconShowcase() {
  const iconEntries = Object.entries(AGENT_ICON_MAP);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Agent Icons Showcase</h1>
      <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8">
        {iconEntries.map(([agentType, IconComponent]) => (
          <div
            key={agentType}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/50 p-2">
              <IconComponent className="h-full w-full" />
            </div>
            <span className="text-center text-xs text-muted-foreground">
              {agentType}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
