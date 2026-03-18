import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { SkillCard } from '@/components/skills/SkillCard';
import { useSkillsStore } from '@/stores/skills';

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Installed() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const skills = useSkillsStore((state) => state.skills);
  const isLoading = useSkillsStore((state) => state.isLoading);
  const error = useSkillsStore((state) => state.error);
  const fetchSkills = useSkillsStore((state) => state.fetchSkills);
  const removeSkill = useSkillsStore((state) => state.removeSkill);
  const updateSkill = useSkillsStore((state) => state.updateSkill);
  const updateResults = useSkillsStore((state) => state.updateResults);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  const handleRefresh = () => {
    void fetchSkills();
  };

  const handleRemove = async (name: string) => {
    await removeSkill(name);
  };

  const handleUpdate = async (name: string) => {
    await updateSkill(name);
  };

  const getUpdateInfo = (name: string) => {
    return updateResults.find((r) => r.name === name);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title={t('pages.installed.title', 'Installed Skills')}
        description={t('pages.installed.description', 'Manage your installed skills')}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2">{t('common.refresh', 'Refresh')}</span>
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading && skills.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        ) : skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('pages.installed.empty.title', 'No skills installed')}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t(
                'pages.installed.empty.description',
                'Browse the discover page to find and install skills for your agents.'
              )}
            </p>
            <Button onClick={() => navigate('/discover')}>
              {t('pages.installed.empty.action', 'Discover Skills')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                updateInfo={getUpdateInfo(skill.name)}
                onRemove={handleRemove}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
