import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentMCPPanel } from '@/components/agents/AgentMCPPanel';
import { useAgentsStore } from '@/stores/agents';
import { useSkillsStore, type Skill } from '@/stores/skills';
import { getAgentIcon } from '@/lib/agent-icons';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Zap,
  Server,
  Bot,
  AlertCircle,
  GitBranch,
  Package,
  ExternalLink,
} from 'lucide-react';

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  CLI: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-500' },
  IDE: { bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-500' },
  Web: { bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-500' },
  Desktop: { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-500' },
};

function getCategoryStyle(category: string) {
  return categoryColors[category] || categoryColors.CLI;
}

function getInitialColor(category: string) {
  const colors: Record<string, string> = {
    CLI: 'from-blue-600 to-blue-400',
    IDE: 'from-purple-600 to-purple-400',
    Web: 'from-green-600 to-green-400',
    Desktop: 'from-orange-600 to-orange-400',
  };
  return colors[category] || colors.CLI;
}

export default function AgentDetail() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { agents, isLoading, fetchAgents } = useAgentsStore();
  const fetchSkillsForAgent = useSkillsStore((state) => state.fetchSkillsForAgent);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);

  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents();
    }
  }, [agents.length, fetchAgents]);

  useEffect(() => {
    if (type) {
      setSkillsLoading(true);
      fetchSkillsForAgent(type).then((agentSkills) => {
        setSkills(agentSkills);
        setSkillsLoading(false);
      });
    }
  }, [type, fetchSkillsForAgent]);

  const agent = agents.find((a) => a.config.type === type);

  if (isLoading || !agent) {
    return (
      <div className="flex h-full flex-col">
        <Header
          title={t('pages.agentDetail.title')}
          description={t('pages.agentDetail.description')}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const { config, installed, isOnline, skillCount, mcpCount } = agent;
  const catStyle = getCategoryStyle(config.category);
  const gradientColor = getInitialColor(config.category);
  const initial = config.displayName.charAt(0).toUpperCase();
  const IconComponent = getAgentIcon(config.type);

  if (!installed) {
    return (
      <div className="flex h-full flex-col">
        <Header
          title={config.displayName}
          description={t('pages.agentDetail.notInstalled')}
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/agents')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          }
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('pages.agentDetail.notInstalledDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        title={config.displayName}
        description={config.description || t('pages.agentDetail.description')}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/agents')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Agent Info Card */}
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-6">
            {/* Icon */}
            {IconComponent ? (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary/30 p-3">
                <IconComponent className="h-full w-full" style={{ color: 'currentColor' }} />
              </div>
            ) : (
              <div
                className={cn(
                  'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-bold text-white shadow-lg',
                  gradientColor
                )}
              >
                {initial}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-semibold">{config.displayName}</h1>
                <span className="relative flex h-3 w-3">
                  {isOnline && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-40" />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-3 w-3 rounded-full',
                      isOnline ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                  />
                </span>
                <Badge
                  variant="secondary"
                  className={cn('text-xs font-semibold uppercase', catStyle.bg, catStyle.text)}
                >
                  {config.category}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {isOnline ? t('pages.agentDetail.status.online') : t('pages.agentDetail.status.offline')}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium">{skillCount}</span>
                  <span className="text-muted-foreground">{t('pages.agentDetail.skills')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Server className="h-4 w-4 text-primary" />
                  <span className="font-medium">{mcpCount}</span>
                  <span className="text-muted-foreground">{t('pages.agentDetail.mcpServers')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Config paths */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-secondary/30 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{t('pages.agentDetail.skillsDir')}</p>
              <code className="text-xs font-mono">{config.globalSkillsDir || config.skillsDir}</code>
            </div>
            {config.supportsMcp && (
              <div className="rounded-lg bg-secondary/30 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">{t('pages.agentDetail.mcpConfig')}</p>
                <code className="text-xs font-mono">{config.mcpConfig?.configPath || 'N/A'}</code>
              </div>
            )}
          </div>
        </div>

        {/* MCP Management Section */}
        {config.supportsMcp && (
          <div className="rounded-xl border border-border bg-card p-6">
            <AgentMCPPanel
              agent={agent}
              isExpanded={true}
              onToggle={() => {}}
            />
          </div>
        )}

        {/* Skills Section */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('pages.agentDetail.installedSkills')}</h2>
            <Badge variant="secondary">{skillCount}</Badge>
          </div>

          {skillsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">{t('pages.agentDetail.noSkills')}</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/discover')}>
                {t('pages.agentDetail.discoverSkills')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className={cn(
                    'flex items-start gap-4 rounded-lg border border-border bg-secondary/30 p-4',
                    'transition-all duration-150 hover:border-primary/30 hover:bg-secondary/50 cursor-pointer'
                  )}
                  onClick={() => navigate(`/installed/${encodeURIComponent(skill.name)}`)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">{skill.name}</h3>
                      {skill.version && (
                        <Badge variant="outline" className="shrink-0 text-[10px] font-mono px-1.5 py-0">
                          v{skill.version}
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed mt-1">
                      {skill.description || t('common.noDescription')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-gray-500/15 text-gray-400 border-gray-500/25"
                      >
                        {skill.source.type}
                      </Badge>
                      {skill.author && (
                        <span className="text-[11px] text-muted-foreground">{skill.author}</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
