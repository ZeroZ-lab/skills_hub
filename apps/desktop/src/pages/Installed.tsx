import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Package,
  Loader2,
  Download,
  List,
  LayoutList,
} from "lucide-react";
import { useSkillsStore } from "@/stores/skills";
import {
  useAgentsStore,
  getAgentDisplayName,
  getAgentColor,
  isUniversalAgent,
} from "@/stores/agents";
import { SkillList } from "@/components/skills/SkillList";
import { AgentSkillsView } from "@/components/skills/AgentSkillsView";
import { InstallModal } from "@/components/skills/InstallModal";
import { ImportSkillsModal } from "@/components/skills/ImportSkillsModal";

export default function Installed() {
  const { t } = useTranslation();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"skills" | "agents">("skills");

  const {
    skills,
    isLoading,
    error,
    selectedAgent,
    searchQuery,
    updateResults,
    isCheckingUpdates,
    fetchSkills,
    checkUpdates,
    removeSkill,
    updateSkill,
    setSelectedAgent,
    setSearchQuery,
    setInstallModalOpen,
  } = useSkillsStore();

  const { agents, fetchAgents } = useAgentsStore();
  const installedAgents = agents.filter((a) => a.installed);

  const universalAgents = installedAgents.filter((a) =>
    isUniversalAgent(a.config.type),
  );
  const universalSkillCount = universalAgents[0]?.skillCount ?? 0;

  // Fetch data on mount
  useEffect(() => {
    fetchSkills();
    fetchAgents();
  }, [fetchSkills, fetchAgents]);

  // Re-fetch when filters change
  useEffect(() => {
    fetchSkills();
  }, [selectedAgent, searchQuery, fetchSkills]);

  const handleRemove = (name: string) => {
    removeSkill(name);
  };

  const handleUpdate = async (name: string) => {
    console.log("Updating skill:", name);
    const result = await updateSkill(name);
    if (result) {
      console.log("Skill updated successfully:", result);
    } else {
      console.error("Failed to update skill:", name);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        title={t("pages.skills.title")}
        description={t("pages.skills.description")}
        actions={
          <>
            {/* View mode toggle */}
            <div className="flex items-center rounded-md border border-border p-0.5 gap-0.5">
              <Button
                variant={viewMode === "skills" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                title="Skills 视图"
                onClick={() => setViewMode("skills")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "agents" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                title="Agents 视图"
                onClick={() => setViewMode("agents")}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("pages.skills.actions.import")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkUpdates()}
              disabled={isCheckingUpdates}
            >
              {isCheckingUpdates ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {t("pages.skills.actions.checkUpdates")}
            </Button>
            <Button size="sm" onClick={() => setInstallModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("pages.skills.actions.installSkill")}
            </Button>
          </>
        }
      />

      {/* Filter bar — hidden in agents view */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-border px-8 py-3",
          viewMode === "agents" && "hidden",
        )}
      >
        {/* Agent filter */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="relative flex-1 min-w-0">
            {/* Gradient masks for scroll indication */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />

            {/* Scrollable container with hidden scrollbar */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              <Button
                variant={selectedAgent === "all" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs shrink-0"
                onClick={() => setSelectedAgent("all")}
              >
                {t("pages.skills.filter.allAgents")}
              </Button>

              {/* Universal Agent (grouped) */}
              {universalAgents.length > 0 && (
                <Button
                  variant={
                    selectedAgent === "universal" ? "secondary" : "ghost"
                  }
                  size="sm"
                  className={cn(
                    "h-7 px-2.5 text-xs gap-1.5 shrink-0",
                    selectedAgent === "universal" && "font-semibold",
                  )}
                  onClick={() => setSelectedAgent("universal")}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 px-1 text-[9px] leading-none",
                      getAgentColor("universal"),
                    )}
                  >
                    {universalSkillCount}
                  </Badge>
                  共享 Skills
                </Button>
              )}

              {/* Non-universal agents */}
              {installedAgents
                .filter((a) => a.config.type !== "universal")
                .map((agent) => (
                  <Button
                    key={agent.config.type}
                    variant={
                      selectedAgent === agent.config.type
                        ? "secondary"
                        : "ghost"
                    }
                    size="sm"
                    className={cn(
                      "h-7 px-2.5 text-xs gap-1.5 shrink-0",
                      selectedAgent === agent.config.type && "font-semibold",
                    )}
                    onClick={() => setSelectedAgent(agent.config.type)}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4 px-1 text-[9px] leading-none",
                        getAgentColor(agent.config.type),
                      )}
                    >
                      {agent.skillCount}
                    </Badge>
                    {getAgentDisplayName(agent.config.type)}
                  </Button>
                ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64 shrink-0">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("pages.skills.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Error state */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <span className="text-xs text-destructive-foreground">{error}</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-muted" />
                    <div className="h-3 w-64 rounded bg-muted" />
                    <div className="flex gap-2">
                      <div className="h-4 w-16 rounded-full bg-muted" />
                      <div className="h-4 w-20 rounded-full bg-muted" />
                      <div className="h-4 w-12 rounded-full bg-muted" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : skills.length === 0 && !searchQuery && selectedAgent === "all" ? (
          /* Empty state (no skills at all) */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Package className="h-10 w-10 text-primary/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("pages.skills.empty.title")}
            </h3>
            <p className="mb-6 max-w-md text-sm text-muted-foreground leading-relaxed">
              {t("pages.skills.empty.description")}
            </p>
            <Button onClick={() => setInstallModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("pages.skills.actions.installSkill")}
            </Button>
          </div>
        ) : viewMode === "agents" ? (
          /* Agent-grouped view */
          <AgentSkillsView
            skills={skills}
            agents={installedAgents}
            updateResults={updateResults}
            onRemove={handleRemove}
            onUpdate={handleUpdate}
          />
        ) : (
          <SkillList
            skills={skills}
            updateResults={updateResults}
            onRemove={handleRemove}
            onUpdate={handleUpdate}
          />
        )}
      </div>

      {/* Install modal */}
      <InstallModal />

      {/* Import modal */}
      <ImportSkillsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onComplete={() => {
          void Promise.all([fetchSkills(), fetchAgents()]);
        }}
      />
    </div>
  );
}
