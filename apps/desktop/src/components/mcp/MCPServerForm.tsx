import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Terminal, Radio, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useMCPStore } from '@/stores/mcp';
import type { MCPServer, MCPAgentBindingInput } from '@/stores/mcp';
import { useAgentsStore, getAgentColor, getAgentDisplayName } from '@/stores/agents';

interface MCPServerFormProps {
  server?: MCPServer | null;
  onClose: () => void;
}

type ServerType = 'stdio' | 'sse' | 'streamable-http';

interface EnvVar {
  key: string;
  value: string;
}

interface HeaderEntry {
  key: string;
  value: string;
}

const TYPE_OPTIONS: { value: ServerType; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: 'stdio',
    label: 'Stdio',
    icon: Terminal,
    description: 'Local process communicating via stdin/stdout',
  },
  {
    value: 'sse',
    label: 'SSE',
    icon: Radio,
    description: 'Server-Sent Events over HTTP',
  },
  {
    value: 'streamable-http',
    label: 'HTTP',
    icon: Globe,
    description: 'Streamable HTTP transport',
  },
];

export function MCPServerForm({ server, onClose }: MCPServerFormProps) {
  const { addServer, updateServer, isLoading } = useMCPStore();
  const { agents, fetchAgents } = useAgentsStore();
  const supportedAgents = agents.filter((a) => a.installed && a.config.supportsMcp);

  const isEditing = !!server;

  // Form state
  const [name, setName] = useState(server?.name || '');
  const [serverType, setServerType] = useState<ServerType>(
    (server?.type as ServerType) || 'stdio'
  );
  const [command, setCommand] = useState(server?.config.command || '');
  const [args, setArgs] = useState(server?.config.args?.join('\n') || '');
  const [envVars, setEnvVars] = useState<EnvVar[]>(() => {
    if (server?.config.env) {
      return Object.entries(server.config.env).map(([key, value]) => ({ key, value }));
    }
    return [];
  });
  const [url, setUrl] = useState(server?.config.url || '');
  const [headers, setHeaders] = useState<HeaderEntry[]>(() => {
    if (server?.config.headers) {
      return Object.entries(server.config.headers).map(([key, value]) => ({ key, value }));
    }
    return [];
  });
  const [selectedAgents, setSelectedAgents] = useState<string[]>(() => {
    if (server?.agents) {
      return server.agents.filter((a) => a.enabled).map((a) => a.agent);
    }
    return [];
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const toggleAgentSelection = (agentType: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentType)
        ? prev.filter((a) => a !== agentType)
        : [...prev, agentType]
    );
  };

  const addEnvVar = () => setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  const removeEnvVar = (index: number) =>
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  const updateEnvVar = (index: number, field: 'key' | 'value', val: string) =>
    setEnvVars((prev) => prev.map((ev, i) => (i === index ? { ...ev, [field]: val } : ev)));

  const addHeader = () => setHeaders((prev) => [...prev, { key: '', value: '' }]);
  const removeHeader = (index: number) =>
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  const updateHeader = (index: number, field: 'key' | 'value', val: string) =>
    setHeaders((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: val } : h)));

  const handleSubmit = async () => {
    setFormError(null);

    if (!name.trim()) {
      setFormError('Server name is required.');
      return;
    }

    if (serverType === 'stdio' && !command.trim()) {
      setFormError('Command is required for stdio servers.');
      return;
    }

    if ((serverType === 'sse' || serverType === 'streamable-http') && !url.trim()) {
      setFormError('URL is required for SSE/HTTP servers.');
      return;
    }

    const config: Record<string, unknown> = {};
    if (serverType === 'stdio') {
      config.command = command.trim();
      const parsedArgs = args
        .split('\n')
        .map((a) => a.trim())
        .filter(Boolean);
      if (parsedArgs.length > 0) config.args = parsedArgs;
      const envObj: Record<string, string> = {};
      envVars.forEach((ev) => {
        if (ev.key.trim()) envObj[ev.key.trim()] = ev.value;
      });
      if (Object.keys(envObj).length > 0) config.env = envObj;
    } else {
      config.url = url.trim();
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key.trim()) headerObj[h.key.trim()] = h.value;
      });
      if (Object.keys(headerObj).length > 0) config.headers = headerObj;
    }

    const agentBindings: MCPAgentBindingInput[] = selectedAgents.map((agent) => ({
      agent,
      enabled: true,
    }));

    if (isEditing && server) {
      const result = await updateServer(server.id, {
        name: name.trim(),
        config,
        agents: agentBindings,
      });
      if (result) onClose();
    } else {
      const result = await addServer(name.trim(), serverType, config, agentBindings);
      if (result) onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="relative w-[600px] max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit MCP Server' : 'Add MCP Server'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Server Name */}
          <div>
            <Label className="mb-1.5 block">Server Name</Label>
            <Input
              placeholder="e.g. my-mcp-server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Server Type */}
          <div>
            <Label className="mb-2 block">Transport Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all duration-150',
                    serverType === value
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-transparent hover:bg-accent/30'
                  )}
                  onClick={() => setServerType(value)}
                  disabled={isEditing}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Stdio Config */}
          {serverType === 'stdio' && (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Command</Label>
                <Input
                  placeholder="e.g. npx, python, node"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Arguments (one per line)</Label>
                <textarea
                  placeholder={"e.g.\n-y\n@modelcontextprotocol/server-filesystem\n/path/to/dir"}
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  rows={4}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono',
                    'ring-offset-background placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50 resize-y'
                  )}
                />
              </div>

              {/* Environment Variables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Environment Variables</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addEnvVar}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>
                {envVars.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No environment variables configured.</p>
                ) : (
                  <div className="space-y-2">
                    {envVars.map((ev, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="KEY"
                          value={ev.key}
                          onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                          className="flex-1 font-mono text-xs h-8"
                        />
                        <span className="text-muted-foreground text-xs">=</span>
                        <Input
                          placeholder="value"
                          value={ev.value}
                          onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                          className="flex-1 font-mono text-xs h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive-foreground"
                          onClick={() => removeEnvVar(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SSE / HTTP Config */}
          {(serverType === 'sse' || serverType === 'streamable-http') && (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block">URL</Label>
                <Input
                  placeholder="e.g. http://localhost:3000/sse"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {/* Headers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Headers</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addHeader}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>
                {headers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No custom headers configured.</p>
                ) : (
                  <div className="space-y-2">
                    {headers.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="Header-Name"
                          value={h.key}
                          onChange={(e) => updateHeader(i, 'key', e.target.value)}
                          className="flex-1 font-mono text-xs h-8"
                        />
                        <span className="text-muted-foreground text-xs">:</span>
                        <Input
                          placeholder="value"
                          value={h.value}
                          onChange={(e) => updateHeader(i, 'value', e.target.value)}
                          className="flex-1 font-mono text-xs h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive-foreground"
                          onClick={() => removeHeader(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Agent Selection */}
          <div>
            <Label className="mb-2 block">Assign to Agents</Label>
            <div className="space-y-2">
              {supportedAgents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No MCP-compatible agents detected. Install one first.
                </p>
              ) : (
                supportedAgents.map((agent) => {
                  const isSelected = selectedAgents.includes(agent.config.type);
                  return (
                    <label
                      key={agent.config.type}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-150',
                        isSelected
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-transparent hover:bg-accent/30'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAgentSelection(agent.config.type)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs px-2 py-0.5',
                          getAgentColor(agent.config.type)
                        )}
                      >
                        {getAgentDisplayName(agent.config.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {agent.mcpCount} MCP servers
                      </span>
                      {agent.isOnline && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          Online
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Error */}
          {formError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-xs text-destructive-foreground">{formError}</p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Server'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
