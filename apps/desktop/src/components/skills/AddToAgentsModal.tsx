import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X, Loader2, CheckCircle2, UserPlus } from 'lucide-react';
import {
  useAgentsStore,
  getAgentColor,
  getAgentDisplayName,
  isUniversalAgent,
} from '@/stores/agents';
import type { Skill } from '@/stores/skills';

interface AddToAgentsModalProps {
  skill: Skill;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddToAgentsModal({ skill, onClose, onSuccess }: AddToAgentsModalProps) {
  const { t } = useTranslation();
  const { agents } = useAgentsStore();
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get installed agents
  const installedAgents = agents.filter((a) => a.installed);

  // Align with InstallModal: universal agents share one "共享 Skills" target.
  const installedAgentTypes = new Set(skill.installs.map((i) => i.agent.toLowerCase()));
  const hasSharedUniversalInstall =
    installedAgentTypes.has('universal') || installedAgentTypes.has('global');
  const universalAgents = installedAgents.filter((a) => isUniversalAgent(a.config.type));
  const nonUniversalAgents = installedAgents.filter((a) => !isUniversalAgent(a.config.type));
  const uncoveredUniversalAgents = hasSharedUniversalInstall
    ? []
    : universalAgents.filter((a) => !installedAgentTypes.has(a.config.type.toLowerCase()));
  const availableAgents = nonUniversalAgents.filter(
    (a) => !installedAgentTypes.has(a.config.type.toLowerCase())
  );
  const hasUniversalOption = uncoveredUniversalAgents.length > 0;
  const hasAvailableTargets = hasUniversalOption || availableAgents.length > 0;
  const effectiveSelectedCount = selectedAgents.reduce((count, agentType) => {
    if (agentType === 'universal') {
      return count + uncoveredUniversalAgents.length;
    }
    return count + 1;
  }, 0);

  const toggleAgent = (agentType: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentType)
        ? prev.filter((a) => a !== agentType)
        : [...prev, agentType]
    );
  };

  const handleAdd = async () => {
    if (selectedAgents.length === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      await invoke('add_skill_to_agents', {
        name: skill.name,
        agents: selectedAgents,
        mode: 'symlink',
        scope: 'global',
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(String(err));
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t('common.addToAgents')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {skill.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {t('common.success')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Skill 已添加到 {effectiveSelectedCount} 个 agents
              </p>
            </div>
          ) : !hasAvailableTargets ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                此 skill 已安装到所有可用目标
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                选择要添加此 skill 的目标。共享 Skills 会覆盖当前所有支持共享目录的 agents。
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid max-h-96 gap-2 overflow-y-auto">
                {hasUniversalOption && (
                  <button
                    key="universal"
                    onClick={() => toggleAgent('universal')}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                      selectedAgents.includes('universal')
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                        selectedAgents.includes('universal')
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {selectedAgents.includes('universal') && (
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">共享 Skills</span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getAgentColor('universal'))}
                        >
                          共享目录
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        会覆盖当前 {uncoveredUniversalAgents.length} 个通用 agents
                      </p>
                    </div>
                  </button>
                )}

                {availableAgents.map((agent) => (
                  <button
                    key={agent.config.type}
                    onClick={() => toggleAgent(agent.config.type)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-4 text-left transition-all',
                      selectedAgents.includes(agent.config.type)
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                        selectedAgents.includes(agent.config.type)
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {selectedAgents.includes(agent.config.type) && (
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {getAgentDisplayName(agent.config.type)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getAgentColor(agent.config.type))}
                        >
                          {agent.config.category}
                        </Badge>
                      </div>
                      {agent.config.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {agent.config.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && hasAvailableTargets && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <p className="text-sm text-muted-foreground">
              已选择 {selectedAgents.length} 个目标，实际覆盖 {effectiveSelectedCount} 个 agents
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={isAdding}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleAdd}
                disabled={selectedAgents.length === 0 || isAdding}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    添加中...
                  </>
                ) : (
                  <>添加到 {effectiveSelectedCount} 个 agents</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
