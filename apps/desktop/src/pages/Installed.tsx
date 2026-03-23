import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Loader2, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { SkillCard } from '@/components/skills/SkillCard';
import { MCPGlobalView } from '@/components/skills/MCPGlobalView';
import { UnifiedImportModal } from '@/components/skills/UnifiedImportModal';
import { useSkillsStore } from '@/stores/skills';
import { useMCPStore } from '@/stores/mcp';

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
  const fetchAllServers = useMCPStore((state) => state.fetchAllServers);

  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  const handleRefresh = () => {
    void fetchSkills();
  };

  const handleImportComplete = () => {
    void fetchSkills();
    void fetchAllServers();
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
        title={t('pages.installed.title', 'Library')}
        description={t('pages.installed.description', 'Manage your installed skills and MCP servers')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
            >
              <Download className="w-4 h-4" />
              <span className="ml-2">{t('common.import', 'Import')}</span>
            </Button>
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
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="skills">
          <TabsList className="mb-4">
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="mcp">MCP Servers</TabsTrigger>
          </TabsList>

          <TabsContent value="skills">
            {isLoading && skills.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={handleRefresh} variant="outline">
                  {t('common.retry', 'Retry')}
                </Button>
              </div>
            ) : skills.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
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
          </TabsContent>

          <TabsContent value="mcp">
            <MCPGlobalView />
          </TabsContent>
        </Tabs>
      </div>

      <UnifiedImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onComplete={handleImportComplete}
      />
    </div>
  );
}
