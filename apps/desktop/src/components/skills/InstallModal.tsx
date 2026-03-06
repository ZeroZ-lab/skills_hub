import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Check,
  AlertCircle,
  GitBranch,
  Link2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSkillsStore } from '@/stores/skills';
import { useAgentsStore, getAgentColor, getAgentDisplayName, isUniversalAgent } from '@/stores/agents';

type Step = 'source' | 'resolved' | 'config' | 'installing' | 'done' | 'error';

export function InstallModal() {
  const {
    installModalOpen,
    installSource,
    isInstalling,
    resolvedSkills,
    isResolving,
    resolveError,
    installError,
    setInstallModalOpen,
    setInstallSource,
    resolveSource,
    installSkill,
    clearResolvedSkills,
  } = useSkillsStore();

  const { agents, fetchAgents } = useAgentsStore();

  const [step, setStep] = useState<Step>('source');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [installMode, setInstallMode] = useState<'symlink' | 'copy'>('symlink');
  const [selectedSkillIndices, setSelectedSkillIndices] = useState<number[]>([0]);
  const [installProgress, setInstallProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const installedAgents = agents.filter((a) => a.installed);

  useEffect(() => {
    if (installModalOpen) {
      fetchAgents();
      setStep('source');
      setSelectedAgents([]);
      setInstallMode('symlink');
      setSelectedSkillIndices([0]);
      setInstallProgress({ done: 0, total: 0 });
      clearResolvedSkills();
    }
  }, [installModalOpen, fetchAgents, clearResolvedSkills]);

  useEffect(() => {
    if (installedAgents.length > 0 && selectedAgents.length === 0) {
      setSelectedAgents([installedAgents[0].config.type]);
    }
  }, [installedAgents, selectedAgents.length]);

  useEffect(() => {
    if (resolvedSkills.length > 0 && step === 'source') {
      setSelectedSkillIndices(resolvedSkills.map((_, i) => i));
      setStep('resolved');
    }
  }, [resolvedSkills, resolveError, step]);

  if (!installModalOpen) return null;

  const handleResolve = async () => {
    if (!installSource.trim()) return;
    await resolveSource(installSource.trim());
  };

  const handleInstall = async () => {
    if (selectedAgents.length === 0 || selectedSkillIndices.length === 0) return;
    setStep('installing');
    setInstallProgress({ done: 0, total: selectedSkillIndices.length });
    let lastResult = null;
    for (let i = 0; i < selectedSkillIndices.length; i++) {
      const skill = resolvedSkills[selectedSkillIndices[i]];
      const source = skill.source.url || installSource.trim();
      lastResult = await installSkill(source, selectedAgents, installMode, 'global');
      setInstallProgress({ done: i + 1, total: selectedSkillIndices.length });
      if (!lastResult) break;
    }
    if (lastResult) {
      setStep('done');
    } else {
      setStep('error');
    }
  };

  const toggleAgent = (agentType: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentType)
        ? prev.filter((a) => a !== agentType)
        : [...prev, agentType]
    );
  };

  const toggleSkill = (i: number) => {
    setSelectedSkillIndices((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const toggleAllSkills = () => {
    if (selectedSkillIndices.length === resolvedSkills.length) {
      setSelectedSkillIndices([]);
    } else {
      setSelectedSkillIndices(resolvedSkills.map((_, i) => i));
    }
  };

  const resolvedSkill = resolvedSkills[selectedSkillIndices[0] ?? 0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => {
        if (!isInstalling) setInstallModalOpen(false);
      }}
    >
      <div
        className="relative w-[560px] max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Install Skill</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setInstallModalOpen(false)}
            disabled={isInstalling}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border">
          {(['source', 'resolved', 'config'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'text-xs font-medium transition-colors',
                  step === s || (['installing', 'done', 'error'].includes(step) && s === 'config')
                    ? 'text-primary'
                    : resolvedSkills.length > 0 && i <= ['source', 'resolved', 'config'].indexOf(step)
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {i + 1}. {s === 'source' ? 'Source' : s === 'resolved' ? 'Preview' : 'Configure'}
              </span>
            </div>
          ))}
        </div>

        <div className="p-6">
          {/* ── Step 1: Source ── */}
          {step === 'source' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Skill Source
                </label>
                <p className="mb-3 text-xs text-muted-foreground">
                  Enter a GitHub URL, shorthand (owner/repo), or local path
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. vercel/skills/skills/find-skills or https://github.com/..."
                    value={installSource}
                    onChange={(e) => setInstallSource(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleResolve();
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={handleResolve}
                    disabled={!installSource.trim() || isResolving}
                  >
                    {isResolving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Resolve
                  </Button>
                </div>
              </div>

              {resolveError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <AlertCircle className="h-4 w-4 text-destructive-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive-foreground">{resolveError}</p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-foreground mb-2">Examples:</p>
                <div className="space-y-1.5">
                  {[
                    'vercel/skills/skills/find-skills',
                    'https://github.com/user/repo/tree/main/skills/my-skill',
                    '/path/to/local/skill',
                  ].map((ex) => (
                    <button
                      key={ex}
                      className="block w-full text-left rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground font-mono transition-colors"
                      onClick={() => setInstallSource(ex)}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Resolved ── */}
          {step === 'resolved' && (
            <div className="space-y-4">
              {resolvedSkills.length > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {selectedSkillIndices.length} / {resolvedSkills.length} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={toggleAllSkills}
                    >
                      {selectedSkillIndices.length === resolvedSkills.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {resolvedSkills.map((rs, i) => {
                      const isSelected = selectedSkillIndices.includes(i);
                      return (
                        <Button
                          key={rs.name}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleSkill(i)}
                        >
                          {isSelected && <Check className="mr-1 h-3 w-3" />}
                          {rs.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <GitBranch className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {resolvedSkill?.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {resolvedSkill?.description || 'No description available'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Source:</span>
                    <span className="ml-1.5 text-foreground">{resolvedSkill?.source.type}</span>
                  </div>
                  {resolvedSkill?.version && (
                    <div>
                      <span className="text-muted-foreground">Version:</span>
                      <span className="ml-1.5 text-foreground">v{resolvedSkill.version}</span>
                    </div>
                  )}
                  {resolvedSkill?.author && (
                    <div>
                      <span className="text-muted-foreground">Author:</span>
                      <span className="ml-1.5 text-foreground">{resolvedSkill.author}</span>
                    </div>
                  )}
                </div>

                {resolvedSkill?.tags && resolvedSkill.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {resolvedSkill.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('source');
                    clearResolvedSkills();
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep('config')}
                  disabled={selectedSkillIndices.length === 0}
                >
                  Configure Install ({selectedSkillIndices.length})
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Configuration ── */}
          {step === 'config' && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Install to Agents
                </label>
                <div className="space-y-2">
                  {installedAgents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No agents detected. Install an agent first.
                    </p>
                  ) : (() => {
                    const universalInstalled = installedAgents.filter((a) => isUniversalAgent(a.config.type));
                    const nonUniversalInstalled = installedAgents.filter((a) => !isUniversalAgent(a.config.type));
                    const isUniversalSelected = selectedAgents.includes('universal');
                    const universalSkillCount = universalInstalled[0]?.skillCount ?? 0;
                    return (
                      <>
                        {universalInstalled.length > 0 && (
                          <label
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-150',
                              isUniversalSelected
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-border bg-transparent hover:bg-accent/30'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isUniversalSelected}
                              onChange={() => toggleAgent('universal')}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            <Badge
                              variant="outline"
                              className={cn('text-xs px-2 py-0.5', getAgentColor('universal'))}
                            >
                              共享 Skills
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {universalSkillCount} skills · {universalInstalled.length} agents
                            </span>
                          </label>
                        )}
                        {nonUniversalInstalled.map((agent) => {
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
                                onChange={() => toggleAgent(agent.config.type)}
                                className="h-4 w-4 rounded border-border accent-primary"
                              />
                              <Badge
                                variant="outline"
                                className={cn('text-xs px-2 py-0.5', getAgentColor(agent.config.type))}
                              >
                                {getAgentDisplayName(agent.config.type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {agent.skillCount} skills installed
                              </span>
                              {agent.isOnline && (
                                <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                  Online
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>

              <Separator />

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Install Mode
                </label>
                <div className="flex gap-2">
                  {(['symlink', 'copy'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={installMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setInstallMode(mode)}
                      className="flex-1"
                    >
                      {mode === 'symlink' ? 'Symlink' : 'Copy'}
                    </Button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {installMode === 'symlink'
                    ? 'Creates a symbolic link to the cached skill (recommended, auto-updates).'
                    : 'Copies skill files directly (isolated, manual updates).'}
                </p>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('resolved')}>
                  Back
                </Button>
                <Button
                  onClick={handleInstall}
                  disabled={selectedAgents.length === 0 || selectedSkillIndices.length === 0}
                >
                  Install {selectedSkillIndices.length > 1 ? `${selectedSkillIndices.length} Skills` : 'Skill'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Installing ── */}
          {step === 'installing' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <h3 className="text-sm font-medium text-foreground mb-1">Installing skills...</h3>
              <p className="text-xs text-muted-foreground">
                {installProgress.done} / {installProgress.total} done
              </p>
            </div>
          )}

          {/* ── Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 mb-4">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                Skill installed successfully
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {resolvedSkill?.name || installSource} is now available.
              </p>
              <Button onClick={() => setInstallModalOpen(false)}>Done</Button>
            </div>
          )}

          {/* ── Error ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">Installation failed</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                {installError || 'An unknown error occurred'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('config')}>
                  Try Again
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setInstallModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
