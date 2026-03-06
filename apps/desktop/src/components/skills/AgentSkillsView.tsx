import { useState } from 'react';
import { ChevronDown, ChevronRight, Package, Folder } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SkillCard } from './SkillCard';
import type { Skill, UpdateCheckResult } from '@/stores/skills';
import type { AgentStatus } from '@/stores/agents';
import { getAgentColor, getAgentDisplayName, isUniversalAgent } from '@/stores/agents';

interface AgentSkillsViewProps {
  skills: Skill[];
  agents: AgentStatus[];
  updateResults: UpdateCheckResult[];
  onRemove: (name: string) => void;
  onUpdate: (name: string) => void;
}

interface DirectoryGroup {
  directory: string;
  displayPath: string;
  skills: Skill[];
}

interface AgentGroup {
  agentType: string;
  displayName: string;
  directories: DirectoryGroup[];
  totalSkills: number;
}

function extractDirectory(installedPath: string): string {
  // Extract the parent directory from the installed path
  // e.g., "/Users/xxx/.gemini/skills/brainstorming" -> "~/.gemini/skills"

  // Normalize path - remove trailing slash if present
  const path = installedPath.replace(/\/$/, '');

  // Find the skills directory
  const skillsIndex = path.lastIndexOf('/skills/');
  if (skillsIndex !== -1) {
    // Get directory up to and including 'skills'
    const dirPath = path.substring(0, skillsIndex + 7); // +7 for '/skills'

    // Replace home directory with ~
    // Try to get home directory from environment or use common pattern
    const homePattern = /^\/Users\/[^/]+/; // macOS
    const linuxHomePattern = /^\/home\/[^/]+/; // Linux

    if (homePattern.test(dirPath)) {
      return dirPath.replace(homePattern, '~');
    } else if (linuxHomePattern.test(dirPath)) {
      return dirPath.replace(linuxHomePattern, '~');
    }

    return dirPath;
  }

  // Fallback: return parent directory
  const lastSlash = path.lastIndexOf('/');
  return lastSlash > 0 ? path.substring(0, lastSlash) : path;
}

function buildAgentGroups(skills: Skill[], agents: AgentStatus[]): AgentGroup[] {
  // Collect all agent types that appear in installs
  const agentTypeSet = new Set<string>();
  for (const skill of skills) {
    for (const install of skill.installs) {
      agentTypeSet.add(install.agent);
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
    // Get all skills for this agent
    const agentSkills = skills.filter((s) => s.installs.some((i) => i.agent === agentType));

    // Group skills by directory (using the install path for THIS agent)
    const dirMap = new Map<string, Skill[]>();
    for (const skill of agentSkills) {
      // Find the install record for THIS specific agent
      const install = skill.installs.find((i) => i.agent === agentType);
      if (install) {
        const dir = extractDirectory(install.installedPath);
        if (!dirMap.has(dir)) {
          dirMap.set(dir, []);
        }
        dirMap.get(dir)!.push(skill);
      }
    }

    // Convert to array and sort by directory path
    const directories: DirectoryGroup[] = Array.from(dirMap.entries())
      .map(([directory, skills]) => ({
        directory,
        displayPath: directory,
        skills,
      }))
      .sort((a, b) => a.directory.localeCompare(b.directory));

    return {
      agentType,
      displayName: getAgentDisplayName(agentType),
      directories,
      totalSkills: agentSkills.length,
    };
  });
}

function DirectorySection({
  directory,
  updateMap,
  onRemove,
  onUpdate,
  defaultOpen,
}: {
  directory: DirectoryGroup;
  updateMap: Map<string, UpdateCheckResult>;
  onRemove: (name: string) => void;
  onUpdate: (name: string) => void;
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
        <Folder className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-xs font-mono text-muted-foreground">{directory.displayPath}</span>
        <Badge variant="secondary" className="ml-auto shrink-0 text-[9px] px-1 py-0">
          {directory.skills.length}
        </Badge>
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-border/50 p-2">
          {directory.skills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              updateInfo={updateMap.get(skill.name)}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentSection({
  group,
  updateMap,
  onRemove,
  onUpdate,
  defaultOpen,
}: {
  group: AgentGroup;
  updateMap: Map<string, UpdateCheckResult>;
  onRemove: (name: string) => void;
  onUpdate: (name: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const colorClass = getAgentColor(group.agentType);
  const isUniversal = isUniversalAgent(group.agentType);

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
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', colorClass)}>
          {isUniversal ? '通用' : group.agentType}
        </Badge>
        <span className="text-sm font-semibold text-foreground">{group.displayName}</span>
        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px] px-1.5 py-0">
          {group.totalSkills} skill{group.totalSkills !== 1 ? 's' : ''}
        </Badge>
      </button>

      {/* Directories list */}
      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-3">
          {group.directories.map((dir, i) => (
            <DirectorySection
              key={dir.directory}
              directory={dir}
              updateMap={updateMap}
              onRemove={onRemove}
              onUpdate={onUpdate}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentSkillsView({
  skills,
  agents,
  updateResults,
  onRemove,
  onUpdate,
}: AgentSkillsViewProps) {
  const updateMap = new Map(updateResults.map((r) => [r.name, r]));
  const groups = buildAgentGroups(skills, agents);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Package className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No agents with skills</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Install skills and assign them to agents to see them here.
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
          updateMap={updateMap}
          onRemove={onRemove}
          onUpdate={onUpdate}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
