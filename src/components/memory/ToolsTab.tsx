"use client";

import { ChevronDown, ChevronRight, ChevronUp, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getToolsAction, type ProjectToolRecord } from "@/app/actions/getCustomSkillsAction";
import { toggleToolAction } from "@/app/actions/toggleCustomSkillAction";
import type { Project } from "@/components/project/ProjectsContext";
import { cn } from "@/lib/utils";
import { BADGE_COLORS, buildToolColorMap } from "@/shared/lib/toolBadgeColors";


// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

// ── ToolRow ───────────────────────────────────────────────────────────────────

function ToolRow({
  tool,
  projectId,
  badgeColor,
  onToggled,
}: {
  tool: ProjectToolRecord;
  projectId: string;
  badgeColor: string;
  onToggled: (slug: string, isEnabled: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleToggle(isEnabled: boolean) {
    setPending(true);
    onToggled(tool.slug, isEnabled); // optimistic
    try {
      await toggleToolAction(projectId, tool.slug, isEnabled);
    } catch (err) {
      onToggled(tool.slug, !isEnabled); // rollback
      toast.error(err instanceof Error ? err.message : "툴 설정 변경에 실패했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div
        className="flex cursor-pointer items-start gap-4 px-4 py-3.5"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{tool.name}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badgeColor)}>
              {tool.slug}
            </span>
            {tool.patternSummary && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                AI 추천
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{tool.description}</p>
          {tool.contextHint && (
            <p className="mt-1.5 text-xs text-muted-foreground/70 italic leading-relaxed">
              {tool.contextHint}
            </p>
          )}
          {expanded && tool.patternSummary && (
            <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-500/80">
              패턴: {tool.patternSummary}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {pending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle checked={tool.isEnabled} onChange={handleToggle} disabled={pending} />
          </div>
          {expanded
            ? <ChevronUp className="size-3.5 text-muted-foreground" />
            : <ChevronDown className="size-3.5 text-muted-foreground" />
          }
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
            {tool.content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── FolderSection ─────────────────────────────────────────────────────────────

function FolderSection({
  folder,
  tools,
  projectId,
  colorMap,
  onToggled,
}: {
  folder: string;
  tools: ProjectToolRecord[];
  projectId: string;
  colorMap: Map<string, string>;
  onToggled: (slug: string, isEnabled: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const enabledCount = tools.filter((t) => t.isEnabled).length;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex cursor-pointer items-center gap-2 text-left"
      >
        {collapsed
          ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        }
        <span className="text-sm font-semibold">{folder}</span>
        <span className="text-xs text-muted-foreground">
          {enabledCount}/{tools.length} 활성화
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2">
          {tools.map((tool) => (
            <ToolRow
              key={tool.slug}
              tool={tool}
              projectId={projectId}
              badgeColor={colorMap.get(tool.slug) ?? BADGE_COLORS[0]}
              onToggled={onToggled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── ToolsTab ──────────────────────────────────────────────────────────────────

export function ToolsTab({ selected }: { selected: Project }) {
  const [tools, setTools] = useState<ProjectToolRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getToolsAction(selected.id)
      .then((data) => {
        if (!cancelled) setTools(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "툴 목록을 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected.id]);

  function handleToggled(slug: string, isEnabled: boolean) {
    setTools((prev) => prev.map((t) => t.slug === slug ? { ...t, isEnabled } : t));
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectToolRecord[]>();
    for (const tool of tools) {
      const bucket = map.get(tool.folder) ?? [];
      bucket.push(tool);
      map.set(tool.folder, bucket);
    }
    return map;
  }, [tools]);

  const orderedFolders = useMemo(() => [...grouped.keys()].sort(), [grouped]);

  const colorMap = useMemo(() => buildToolColorMap(tools.map((t) => t.slug)), [tools]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">툴</h2>
        <span className="text-xs text-muted-foreground">
          AI 도구에서 <code className="rounded bg-muted px-1 py-0.5">load_tool</code>로 불러올 수 있어요.
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          {["개발", "프로세스"].map((label) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <p>등록된 툴이 없어요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orderedFolders.map((folder) => (
            <FolderSection
              key={folder}
              folder={folder}
              tools={grouped.get(folder) ?? []}
              projectId={selected.id}
              colorMap={colorMap}
              onToggled={handleToggled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
