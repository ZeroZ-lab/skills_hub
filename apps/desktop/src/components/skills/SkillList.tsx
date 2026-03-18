import { useState } from 'react';
import { ArrowDownAZ, ArrowUpDown, Calendar, Hash, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SkillCard } from './SkillCard';
import type { Skill, UpdateCheckResult } from '@/stores/skills';

type SortKey = 'name' | 'date' | 'assemblies';

interface SkillListProps {
  skills: Skill[];
  updateResults: UpdateCheckResult[];
  onRemove: (name: string) => void;
  onUpdate: (name: string) => void;
}

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: 'name', label: 'Name', icon: ArrowDownAZ },
  { key: 'date', label: 'Updated', icon: Calendar },
  { key: 'assemblies', label: 'Assemblies', icon: Hash },
];

function sortSkills(skills: Skill[], key: SortKey, asc: boolean): Skill[] {
  const sorted = [...skills].sort((a, b) => {
    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'date':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'assemblies':
        return b.installs.length - a.installs.length;
      default:
        return 0;
    }
  });
  return asc ? sorted : sorted.reverse();
}

export function SkillList({ skills, updateResults, onRemove, onUpdate }: SkillListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const updateMap = new Map(updateResults.map((r) => [r.name, r]));
  const sorted = sortSkills(skills, sortKey, sortAsc);

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Package className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No skills found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No assets match your current search. Try adjusting your query or add a new asset.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sort bar */}
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
          {skills.length} asset{skills.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {sorted.map((skill) => (
          <SkillCard
            key={skill.name}
            skill={skill}
            updateInfo={updateMap.get(skill.name)}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}
