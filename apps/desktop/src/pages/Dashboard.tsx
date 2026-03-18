import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Bot,
  Server,
  ArrowUpCircle,
  ArrowRight,
  Shield,
  Plus,
  ServerCog,
  Radar,
  RefreshCw,
  Settings,
  FolderOpen,
  HardDrive,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickAction } from '@/components/dashboard/QuickAction';
import { AgentStatusList } from '@/components/dashboard/AgentStatusList';
import { useSkillsStore } from '@/stores/skills';
import { useAgentsStore, getAgentColor, getAgentDisplayName } from '@/stores/agents';
import { useMCPStore } from '@/stores/mcp';

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { skills, fetchSkills, updateResults, checkUpdates, isCheckingUpdates } = useSkillsStore();
  const { agents, fetchAgents, detectAgents, isDetecting } = useAgentsStore();
  const { servers, fetchServers } = useMCPStore();

  // Load data on mount
  useEffect(() => {
    fetchSkills();
    fetchAgents();
    fetchServers();
  }, [fetchSkills, fetchAgents, fetchServers]);

  // ─── Computed Values ────────────────────────────────────────────────────

  const installedAgents = agents.filter((a) => a.installed);
  const updatesCount = updateResults.filter((u) => u.hasUpdate).length;

  // Unique agents across all skills
  const allAgentTypes = new Set<string>();
  skills.forEach((skill) => {
    skill.installs.forEach((install) => {
      allAgentTypes.add(install.agent);
    });
  });

  // Top skills by install count
  const topSkills = [...skills].sort((a, b) => b.installs.length - a.installs.length).slice(0, 5);
  const totalInstalls = skills.reduce((sum, skill) => sum + skill.installs.length, 0);
  const onlineAgentsCount = installedAgents.filter((a) => a.isOnline).length;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      <Header title={t('pages.dashboard.title')} description={t('pages.dashboard.description')} />

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-8">
          {/* ── Stat Cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title={t('pages.dashboard.stats.skillsInstalled')}
              value={skills.length}
              icon={Package}
              color="blue"
              description={
                skills.length > 0
                  ? `${t('common.across')} ${allAgentTypes.size} ${t('common.agents')}`
                  : undefined
              }
            />
            <StatCard
              title={t('pages.dashboard.stats.agentsActive')}
              value={installedAgents.length}
              icon={Bot}
              color="green"
              description={
                installedAgents.length > 0
                  ? `${installedAgents.filter((a) => a.isOnline).length} ${t('common.online')}`
                  : undefined
              }
            />
            <StatCard
              title={t('pages.dashboard.stats.mcpServers')}
              value={servers.length}
              icon={Server}
              color="purple"
            />
            <StatCard
              title={t('pages.dashboard.stats.updatesAvailable')}
              value={updatesCount}
              icon={ArrowUpCircle}
              color="amber"
              description={updatesCount > 0 ? t('pages.dashboard.newVersionsReady') : undefined}
            />
            <StatCard
              title={t('pages.dashboard.stats.security')}
              value={
                updatesCount > 0
                  ? `${updatesCount} ${t('pages.dashboard.updates')}`
                  : t('pages.dashboard.noIssues')
              }
              icon={Shield}
              color="emerald"
            />
          </div>

          {/* ── Quick Actions ───────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <QuickAction
              label={t('pages.dashboard.quickActions.installSkill')}
              icon={Plus}
              variant="primary"
              onClick={() => {
                navigate('/installed');
                // The installed page has an install modal we can trigger
                setTimeout(() => {
                  useSkillsStore.getState().setInstallModalOpen(true);
                }, 100);
              }}
            />
            <QuickAction
              label={t('pages.dashboard.quickActions.addMCPServer')}
              icon={ServerCog}
              onClick={() => navigate('/mcp')}
            />
            <QuickAction
              label={
                isDetecting
                  ? t('pages.dashboard.quickActions.detecting')
                  : t('pages.dashboard.quickActions.detectAgents')
              }
              icon={Radar}
              onClick={() => {
                if (!isDetecting) detectAgents();
              }}
            />
            <QuickAction
              label={
                isCheckingUpdates
                  ? t('pages.dashboard.quickActions.checking')
                  : t('pages.dashboard.quickActions.checkUpdates')
              }
              icon={RefreshCw}
              onClick={() => {
                if (!isCheckingUpdates) checkUpdates();
              }}
            />
            <QuickAction
              label={t('pages.dashboard.quickActions.exportConfig')}
              icon={Settings}
              onClick={() => navigate('/settings')}
            />
          </div>

          {/* ── Main Layout ─────────────────────────────────────────────── */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <OverviewCard
                  icon={Bot}
                  title="Agent workspace"
                  value={`${onlineAgentsCount}/${installedAgents.length || 0}`}
                  description={
                    installedAgents.length > 0
                      ? `${onlineAgentsCount} agents are ready for assembly`
                      : 'Run detection to connect your local agent targets'
                  }
                />
                <OverviewCard
                  icon={Package}
                  title="Local assets"
                  value={`${skills.length}`}
                  description={
                    skills.length > 0
                      ? `${totalInstalls} assembled installs across ${allAgentTypes.size} agent types`
                      : 'Add your first asset from the library or market'
                  }
                />
                <OverviewCard
                  icon={Shield}
                  title="Assembly health"
                  value={updatesCount > 0 ? `${updatesCount}` : 'OK'}
                  description={
                    updatesCount > 0
                      ? 'Asset or dependency updates are ready to review'
                      : 'Your current assembly setup looks stable'
                  }
                />
              </div>

              {/* Installed Skills Overview */}
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t('pages.dashboard.installedSkills.title')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Local skill assets ready to be assembled onto your agents.
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/installed')}
                    className="inline-flex items-center gap-1 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Open library
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {topSkills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <Package className="mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      {t('pages.dashboard.installedSkills.empty')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      {t('pages.dashboard.installedSkills.emptyDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {topSkills.map((skill) => {
                      const uniqueAgents = [...new Set(skill.installs.map((i) => i.agent))];

                      return (
                        <button
                          key={skill.name}
                          onClick={() => navigate(`/installed/${encodeURIComponent(skill.name)}`)}
                          className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-accent/50"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <Package className="h-4 w-4 text-primary" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-foreground">
                                {skill.name}
                              </p>
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                                {skill.installs.length} install{skill.installs.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {skill.description ||
                                t('pages.dashboard.installedSkills.noDescription')}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {uniqueAgents.map((agent) => (
                              <Badge
                                key={agent}
                                variant="outline"
                                className={cn('h-5 text-[10px] px-1.5', getAgentColor(agent))}
                              >
                                {getAgentDisplayName(agent)}
                              </Badge>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Agent Status */}
              <AgentStatusList agents={agents} />

              {/* Quick Stats */}
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-6 py-5">
                  <h3 className="text-sm font-semibold text-foreground">Assembly Summary</h3>
                </div>

                <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-1">
                  <QuickStatRow
                    icon={FolderOpen}
                    label="Shared asset dirs"
                    value={String(allAgentTypes.size)}
                  />
                  <QuickStatRow
                    icon={Package}
                    label="Assembled installs"
                    value={String(totalInstalls)}
                  />
                  <QuickStatRow icon={HardDrive} label="Local cache" value="Healthy" />
                  <QuickStatRow
                    icon={ArrowUpCircle}
                    label="Pending updates"
                    value={String(updatesCount)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Stat Row ─────────────────────────────────────────────────────────

function QuickStatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/70">
          <Icon className="h-4.5 w-4.5 text-foreground" />
        </div>
      </div>
    </div>
  );
}
