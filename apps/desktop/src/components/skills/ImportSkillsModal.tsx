import { useState, useEffect } from "react";
import { X, Loader2, Check, Download, AlertCircle, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { useAgentsStore, getAgentDisplayName } from "@/stores/agents";

interface ImportSkillsModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface ScanResult {
  found: number;
  imported: number;
  updated: number;
  removed: number;
  skipped: number;
  errors: string[];
}

type ImportStep = "select" | "scanning" | "done" | "error";

export function ImportSkillsModal({
  open,
  onClose,
  onComplete,
}: ImportSkillsModalProps) {
  const { agents, fetchAgents } = useAgentsStore();
  const installedAgents = agents.filter((a) => a.installed);

  const [step, setStep] = useState<ImportStep>("select");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [scanAll, setScanAll] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchAgents();
      setStep("select");
      setSelectedAgent(null);
      setScanAll(false);
      setResult(null);
      setError(null);
    }
  }, [open, fetchAgents]);

  if (!open) return null;

  const handleImport = async () => {
    setStep("scanning");
    setError(null);

    try {
      let scanResult: ScanResult;

      if (scanAll) {
        scanResult = await invoke<ScanResult>("scan_skills");
      } else if (selectedAgent) {
        scanResult = await invoke<ScanResult>("import_skills", {
          agent: selectedAgent,
        });
      } else {
        setError("请选择一个 agent 或选择扫描所有目录");
        setStep("error");
        return;
      }

      setResult(scanResult);
      setStep("done");

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(String(err));
      setStep("error");
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              导入 Skills
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              重新扫描本地 skills 目录，并用磁盘内容覆盖当前索引
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          {/* Step 1: Select Agent */}
          {step === "select" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent cursor-pointer">
                  <input
                    type="radio"
                    checked={scanAll}
                    onChange={() => {
                      setScanAll(true);
                      setSelectedAgent(null);
                    }}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Scan className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        扫描所有目录
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      重建整份 skills 索引，并移除磁盘上已不存在的记录
                    </p>
                  </div>
                </label>

                <div className="text-sm font-medium text-muted-foreground">
                  或从特定 Agent 导入：
                </div>

                {installedAgents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      未检测到已安装的 agents
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[300px] space-y-2 overflow-y-auto pr-2">
                    {installedAgents.map((agent) => {
                      const isSelected = selectedAgent === agent.config.type;

                      return (
                        <label
                          key={agent.config.type}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-4 transition-colors cursor-pointer",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-accent",
                          )}
                        >
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedAgent(agent.config.type);
                              setScanAll(false);
                            }}
                            className="h-4 w-4"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {getAgentDisplayName(agent.config.type)}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {agent.config.category}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              仅重建 {agent.config.type} 的 skills 记录
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!scanAll && !selectedAgent}
                >
                  <Download className="mr-2 h-4 w-4" />
                  开始导入
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Scanning */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                正在重建 skills 索引...
              </p>
            </div>
          )}

          {/* Step 3: Done */}
          {step === "done" && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  导入完成
                </h3>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    扫描到的 skills:
                  </span>
                  <span className="font-medium text-foreground">
                    {result.found}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">新导入:</span>
                  <span className="font-medium text-green-500">
                    {result.imported}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">覆盖更新:</span>
                  <span className="font-medium text-foreground">
                    {result.updated}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">已移除:</span>
                  <span className="font-medium text-amber-500">
                    {result.removed}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">跳过:</span>
                  <span className="font-medium text-muted-foreground">
                    {result.skipped}
                  </span>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    警告和错误:
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
                    {result.errors.map((err, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleClose}>完成</Button>
              </div>
            </div>
          )}

          {/* Step 4: Error */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  导入失败
                </h3>
                <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
                  {error}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  关闭
                </Button>
                <Button onClick={() => setStep("select")}>重试</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
