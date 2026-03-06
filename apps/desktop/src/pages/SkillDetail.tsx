import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  GitBranch,
  HardDrive,
  ExternalLink,
  RefreshCw,
  Trash2,
  Download,
  FileText,
  Folder,
  User,
  Tag,
  Calendar,
  Copy,
  Link2,
  Loader2,
  AlertCircle,
  UserPlus,
} from 'lucide-react';
import type { SkillDetail as SkillDetailType } from '@/stores/skills';
import { useSkillsStore } from '@/stores/skills';
import { getAgentColor, getAgentDisplayName } from '@/stores/agents';
import { AddToAgentsModal } from '@/components/skills/AddToAgentsModal';

export default function SkillDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { removeSkill, updateSkill, fetchSkills } = useSkillsStore();

  const [detail, setDetail] = useState<SkillDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [showAddToAgents, setShowAddToAgents] = useState(false);

  const skillName = name ? decodeURIComponent(name) : '';

  useEffect(() => {
    if (!skillName) return;

    const loadDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await invoke<SkillDetailType>('get_skill_detail', { name: skillName });
        setDetail(result);
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadDetail();
  }, [skillName]);

  const handleRemove = async () => {
    if (!detail) return;
    setIsRemoving(true);
    try {
      await removeSkill(detail.name);
      navigate('/installed');
    } catch {
      setIsRemoving(false);
    }
  };

  const handleUpdate = async () => {
    if (!detail) return;
    setIsUpdating(true);
    try {
      const updated = await updateSkill(detail.name);
      if (updated) {
        // Reload detail
        const result = await invoke<SkillDetailType>('get_skill_detail', { name: detail.name });
        setDetail(result);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div>
        <Header
          title="Skill Detail"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/installed')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !detail) {
    return (
      <div>
        <Header
          title="Skill Detail"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate('/installed')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Failed to load skill</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {error || `Skill "${skillName}" not found.`}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/installed')}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const sourceType = detail.source.type;

  return (
    <div className="flex h-full flex-col">
      <Header
        title={detail.name}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddToAgents(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              添加到其他 Agents
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/installed')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-8 space-y-6">
          {/* ── Skill header card ── */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <GitBranch className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-foreground">{detail.name}</h2>
                  <Badge variant="outline" className="font-mono text-xs">
                    v{detail.version}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {detail.description || 'No description'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {detail.author && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {detail.author}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(detail.updatedAt)}
                  </span>
                  {detail.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Tag className="mr-0.5 h-2.5 w-2.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Update
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* ── Left column: Main content ── */}
            <div className="col-span-2 space-y-6">
              {/* README content */}
              {detail.readmeContent && (
                <div className="rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">README</span>
                  </div>
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap break-words text-sm text-foreground/90 leading-relaxed font-sans">
                      {detail.readmeContent}
                    </pre>
                  </div>
                </div>
              )}

              {/* Installed agents */}
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Installed Agents ({detail.installs.length})
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {detail.installs.map((install) => (
                    <div
                      key={`${install.agent}-${install.scope}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Badge
                        variant="outline"
                        className={cn('text-xs px-2 py-0.5', getAgentColor(install.agent))}
                      >
                        {getAgentDisplayName(install.agent)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                        {install.scope}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {install.mode === 'symlink' ? (
                          <Link2 className="mr-0.5 h-2.5 w-2.5" />
                        ) : (
                          <Copy className="mr-0.5 h-2.5 w-2.5" />
                        )}
                        {install.mode}
                      </Badge>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {formatDate(install.installedAt)}
                      </span>
                    </div>
                  ))}
                  {detail.installs.length > 0 && (
                    <div className="px-4 py-2.5">
                      {detail.installs.map((install) => (
                        <div
                          key={`path-${install.agent}-${install.scope}`}
                          className="flex items-center gap-2 mt-1 first:mt-0"
                        >
                          <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">
                            {install.installedPath}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => handleCopyPath(install.installedPath)}
                          >
                            {copiedPath === install.installedPath ? (
                              <span className="text-[9px] text-green-400">OK</span>
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right column: Sidebar info ── */}
            <div className="space-y-6">
              {/* Source info */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Source</h4>
                <Separator />
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        sourceType === 'github'
                          ? 'bg-gray-500/15 text-gray-400'
                          : 'bg-blue-500/15 text-blue-400'
                      )}
                    >
                      {sourceType === 'github' ? (
                        <GitBranch className="mr-0.5 h-2.5 w-2.5" />
                      ) : (
                        <HardDrive className="mr-0.5 h-2.5 w-2.5" />
                      )}
                      {sourceType}
                    </Badge>
                  </div>
                  {detail.source.url && (
                    <div>
                      <span className="text-muted-foreground block mb-0.5">URL:</span>
                      <span className="text-foreground font-mono text-[11px] break-all">
                        {detail.source.url}
                      </span>
                    </div>
                  )}
                  {detail.source.subpath && (
                    <div>
                      <span className="text-muted-foreground">Subpath:</span>
                      <span className="ml-1 text-foreground font-mono text-[11px]">
                        {detail.source.subpath}
                      </span>
                    </div>
                  )}
                  {detail.source.ref && (
                    <div>
                      <span className="text-muted-foreground">Ref:</span>
                      <span className="ml-1 text-foreground font-mono text-[11px]">
                        {detail.source.ref}
                      </span>
                    </div>
                  )}
                  {detail.sourceUrl && (
                    <a
                      href={detail.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on GitHub
                    </a>
                  )}
                </div>
              </div>

              {/* File list */}
              {detail.fileList && detail.fileList.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    Files ({detail.fileList.length})
                  </h4>
                  <Separator />
                  <div className="space-y-1">
                    {detail.fileList.map((file) => (
                      <div
                        key={file}
                        className="flex items-center gap-2 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent/30 transition-colors"
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate font-mono">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Metadata</h4>
                <Separator />
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Canonical Path:</span>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="font-mono text-[11px] text-foreground truncate">
                        {detail.canonicalPath}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={() => handleCopyPath(detail.canonicalPath)}
                      >
                        {copiedPath === detail.canonicalPath ? (
                          <span className="text-[9px] text-green-400">OK</span>
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {detail.treeSha && (
                    <div>
                      <span className="text-muted-foreground">Tree SHA:</span>
                      <span className="ml-1 font-mono text-[11px] text-foreground">
                        {detail.treeSha.slice(0, 12)}...
                      </span>
                    </div>
                  )}
                  {detail.contentHash && (
                    <div>
                      <span className="text-muted-foreground">Content Hash:</span>
                      <span className="ml-1 font-mono text-[11px] text-foreground">
                        {detail.contentHash.slice(0, 16)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Agents Modal */}
      {showAddToAgents && detail && (
        <AddToAgentsModal
          skill={detail}
          onClose={() => setShowAddToAgents(false)}
          onSuccess={() => {
            fetchSkills();
            // Reload detail
            invoke<SkillDetailType>('get_skill_detail', { name: detail.name }).then(setDetail);
          }}
        />
      )}
    </div>
  );
}
