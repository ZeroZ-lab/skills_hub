import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettingsStore } from '@/stores/settings';
import type { AppConfig } from '@/stores/settings';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Settings2,
  RefreshCw,
  KeyRound,
  Palette,
  Globe,
  Wrench,
  Eye,
  EyeOff,
  Plus,
  X,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

interface FieldRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

function FieldRow({ label, description, children, htmlFor }: FieldRowProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:items-start">
      <div className="space-y-1">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { config, isLoading, isSaving, error, saveMessage, fetchConfig, updateConfig } =
    useSettingsStore();

  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [newAliasKey, setNewAliasKey] = useState('');
  const [newAliasValue, setNewAliasValue] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  const updateField = useCallback(
    <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: value };
      });
      setHasChanges(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!localConfig) return;
    await updateConfig(localConfig);
    setHasChanges(false);
  }, [localConfig, updateConfig]);

  const addAlias = useCallback(() => {
    if (!newAliasKey.trim() || !newAliasValue.trim() || !localConfig) return;
    const aliases = { ...localConfig.sourceAliases, [newAliasKey.trim()]: newAliasValue.trim() };
    updateField('sourceAliases', aliases);
    setNewAliasKey('');
    setNewAliasValue('');
  }, [newAliasKey, newAliasValue, localConfig, updateField]);

  const removeAlias = useCallback(
    (key: string) => {
      if (!localConfig) return;
      const aliases = { ...localConfig.sourceAliases };
      delete aliases[key];
      updateField('sourceAliases', aliases);
    },
    [localConfig, updateField]
  );

  if (isLoading || !localConfig) {
    return (
      <div>
        <Header title={t('pages.settings.title')} description={t('pages.settings.description')} />
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const themeIcons = {
    system: Monitor,
    light: Sun,
    dark: Moon,
  };
  const ThemeIcon = themeIcons[localConfig.theme as keyof typeof themeIcons] || Monitor;

  return (
    <div className="flex h-full flex-col">
      <Header
        title={t('pages.settings.title')}
        description={t('pages.settings.description')}
        actions={
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className="flex items-center gap-1.5 text-xs text-green-500 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {saveMessage}
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {t('pages.settings.saveError')}
              </span>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? t('pages.settings.saving') : hasChanges ? t('pages.settings.saveChanges') : t('pages.settings.saved')}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-8">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t('pages.settings.sections.general.title')}</CardTitle>
                <CardDescription>{t('pages.settings.sections.general.description')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldRow
              label={t('pages.settings.sections.general.installMode.label')}
              description={t('pages.settings.sections.general.installMode.description')}
              htmlFor="defaultMode"
            >
              <Select
                id="defaultMode"
                value={localConfig.defaultMode}
                onChange={(e) => updateField('defaultMode', e.target.value)}
                options={[
                  { value: 'symlink', label: t('common.installMode.symlink') },
                  { value: 'copy', label: t('common.installMode.copy') },
                ]}
              />
            </FieldRow>
            <FieldRow
              label={t('pages.settings.sections.general.installScope.label')}
              description={t('pages.settings.sections.general.installScope.description')}
              htmlFor="defaultScope"
            >
              <Select
                id="defaultScope"
                value={localConfig.defaultScope}
                onChange={(e) => updateField('defaultScope', e.target.value)}
                options={[
                  { value: 'global', label: t('common.scope.global') },
                  { value: 'project', label: t('common.scope.project') },
                ]}
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t('pages.settings.sections.appearance.title')}</CardTitle>
                <CardDescription>{t('pages.settings.sections.appearance.description')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldRow
              label={t('pages.settings.sections.appearance.theme.label')}
              description={t('pages.settings.sections.appearance.theme.description')}
              htmlFor="theme"
            >
              <div className="flex gap-2">
                <Select
                  id="theme"
                  value={localConfig.theme}
                  onChange={(e) => updateField('theme', e.target.value)}
                  options={[
                    { value: 'system', label: t('pages.settings.sections.appearance.theme.system') },
                    { value: 'light', label: t('pages.settings.sections.appearance.theme.light') },
                    { value: 'dark', label: t('pages.settings.sections.appearance.theme.dark') },
                  ]}
                  className="flex-1"
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/50">
                  <ThemeIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </FieldRow>
          </CardContent>
        </Card>

        {/* Updates */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t('pages.settings.sections.updates.title')}</CardTitle>
                <CardDescription>{t('pages.settings.sections.updates.description')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldRow
              label={t('pages.settings.sections.updates.updateInterval.label')}
              description={t('pages.settings.sections.updates.updateInterval.description')}
              htmlFor="updateInterval"
            >
              <Input
                id="updateInterval"
                type="number"
                min={1}
                max={168}
                value={localConfig.updateInterval}
                onChange={(e) =>
                  updateField('updateInterval', parseInt(e.target.value, 10) || 24)
                }
              />
            </FieldRow>
            <FieldRow
              label={t('pages.settings.sections.updates.cacheTTL.label')}
              description={t('pages.settings.sections.updates.cacheTTL.description')}
              htmlFor="cacheTTL"
            >
              <Input
                id="cacheTTL"
                type="number"
                min={1}
                max={168}
                value={localConfig.cacheTTL}
                onChange={(e) =>
                  updateField('cacheTTL', parseInt(e.target.value, 10) || 24)
                }
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t('pages.settings.sections.authentication.title')}</CardTitle>
                <CardDescription>{t('pages.settings.sections.authentication.description')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldRow
              label={t('pages.settings.sections.authentication.githubToken.label')}
              description={t('pages.settings.sections.authentication.githubToken.description')}
              htmlFor="githubToken"
            >
              <div className="relative">
                <Input
                  id="githubToken"
                  type={showToken ? 'text' : 'password'}
                  value={localConfig.githubToken || ''}
                  onChange={(e) =>
                    updateField('githubToken', e.target.value || null)
                  }
                  placeholder={t('pages.settings.sections.authentication.githubToken.placeholder')}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </FieldRow>
          </CardContent>
        </Card>

        {/* Network */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>网络</CardTitle>
                <CardDescription>代理和连接设置</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FieldRow
              label="代理 URL"
              description="HTTP/SOCKS 代理地址"
              htmlFor="proxy"
            >
              <Input
                id="proxy"
                type="text"
                value={localConfig.proxy || ''}
                onChange={(e) =>
                  updateField('proxy', e.target.value || null)
                }
                placeholder="http://proxy.example.com:8080"
              />
            </FieldRow>
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>高级</CardTitle>
                <CardDescription>自定义注册表和源别名</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldRow
              label="自定义注册表"
              description="自定义 Agent 注册表 URL"
              htmlFor="customAgentRegistry"
            >
              <Input
                id="customAgentRegistry"
                type="text"
                value={localConfig.customAgentRegistry || ''}
                onChange={(e) =>
                  updateField('customAgentRegistry', e.target.value || null)
                }
                placeholder="https://registry.example.com"
              />
            </FieldRow>

            <div className="space-y-3">
              <Label className="text-sm font-medium">源别名</Label>
              <p className="text-xs text-muted-foreground">
                为常用的源 URL 创建快捷别名
              </p>

              {/* Existing aliases */}
              {Object.entries(localConfig.sourceAliases).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(localConfig.sourceAliases).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{key}</p>
                        <p className="text-xs text-muted-foreground truncate">{value}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAlias(key)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new alias */}
              <div className="flex gap-2">
                <Input
                  placeholder="别名"
                  value={newAliasKey}
                  onChange={(e) => setNewAliasKey(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="源 URL"
                  value={newAliasValue}
                  onChange={(e) => setNewAliasValue(e.target.value)}
                  className="flex-[2]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addAlias}
                  disabled={!newAliasKey.trim() || !newAliasValue.trim()}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  添加
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom padding */}
        <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
