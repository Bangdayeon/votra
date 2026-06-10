"use client";

import { Loader2, Pencil, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { BriefPreviewData } from "@/app/actions/getBriefPreviewAction";
import { getBriefPreviewAction } from "@/app/actions/getBriefPreviewAction";
import { getMemoryContextAction } from "@/app/actions/getMemoryContextAction";
import { getProjectKeyDecisionsAction, type KeyDecisionRecord } from "@/app/actions/getProjectKeyDecisionsAction";
import { recallKeyDecisionsAction } from "@/app/actions/recallKeyDecisionsAction";
import {
  type UpdateMemoryContextInput,
  updateMemoryContextAction,
} from "@/app/actions/updateMemoryContextAction";
import type { Project } from "@/components/project/ProjectsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// ── Context edit modal ────────────────────────────────────────────────────────

type ContextFields = Omit<UpdateMemoryContextInput, "projectId">;

const CONTEXT_FIELDS: Array<{ key: keyof ContextFields; label: string; placeholder: string }> = [
  { key: "serviceDescription", label: "서비스 설명", placeholder: "이 프로젝트는 무엇을 하는 서비스인가요?" },
  { key: "techStack", label: "기술 스택", placeholder: "Next.js, Prisma, Neon DB, Gemini..." },
  { key: "targetUsers", label: "대상 유저", placeholder: "누구를 위한 서비스인가요?" },
  { key: "currentGoal", label: "현재 목표", placeholder: "지금 단계에서 달성하려는 것은?" },
];

function ContextEditModal({
  projectId,
  open,
  onOpenChange,
  onSaved,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [fields, setFields] = useState<ContextFields>({
    serviceDescription: "",
    techStack: "",
    targetUsers: "",
    currentGoal: "",
  });
  const [saved, setSaved] = useState<ContextFields>(fields);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isDirty = CONTEXT_FIELDS.some((f) => fields[f.key] !== saved[f.key]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getMemoryContextAction(projectId)
      .then((ctx) => {
        if (!cancelled && ctx) {
          const initial = {
            serviceDescription: ctx.serviceDescription ?? "",
            techStack: ctx.techStack ?? "",
            targetUsers: ctx.targetUsers ?? "",
            currentGoal: ctx.currentGoal ?? "",
          };
          setFields(initial);
          setSaved(initial);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, open]);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateMemoryContextAction({ projectId, ...fields });
      if (result.ok) {
        setSaved(fields);
        toast.success("맥락이 저장됐어요.");
        onSaved();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>프로젝트 맥락 편집</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {CONTEXT_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                <textarea
                  value={fields[key]}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            ))}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-40"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                저장
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({
  title,
  meta,
  action,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </div>
  );
}

// ── 1. Context section ────────────────────────────────────────────────────────

const CONTEXT_DISPLAY_FIELDS = [
  { key: "serviceDescription" as const, label: "서비스" },
  { key: "techStack" as const, label: "기술" },
  { key: "targetUsers" as const, label: "대상" },
  { key: "currentGoal" as const, label: "목표" },
];

function ContextSection({
  preview,
  onEditRequest,
}: {
  preview: BriefPreviewData | undefined;
  onEditRequest: () => void;
}) {
  if (preview === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="mb-3 h-4 w-24 rounded" />
        <div className="flex flex-col gap-2">
          {["w-4/5", "w-3/5", "w-11/12"].map((w, i) => (
            <Skeleton key={i} className={`h-3.5 rounded ${w}`} />
          ))}
        </div>
      </div>
    );
  }

  const { context } = preview;
  const hasContext = context && CONTEXT_DISPLAY_FIELDS.some((f) => context[f.key]);

  if (!hasContext) {
    return (
      <button
        onClick={onEditRequest}
        className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center transition-colors hover:border-foreground/20 hover:bg-muted/30"
      >
        <p className="text-sm font-medium text-foreground">프로젝트 맥락이 없어요</p>
        <p className="text-xs text-muted-foreground">
          서비스 설명, 기술 스택, 대상 유저, 현재 목표를 설정하면 에이전트가 더 잘 이해해요.
        </p>
        <span className="mt-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
          맥락 설정하기
        </span>
      </button>
    );
  }

  return (
    <Card
      title="프로젝트 맥락"
      action={
        <button
          onClick={onEditRequest}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="size-3" />
          편집
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        {CONTEXT_DISPLAY_FIELDS.map(({ key, label }) =>
          context[key] ? (
            <div key={key} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 text-muted-foreground">{label}</span>
              <span className="text-foreground">{context[key]}</span>
            </div>
          ) : null
        )}
      </div>
    </Card>
  );
}

// ── 2. In-progress section ────────────────────────────────────────────────────

function InProgressSection({ preview }: { preview: BriefPreviewData | undefined }) {
  if (preview === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="mb-3 h-4 w-28 rounded" />
        <div className="flex flex-col gap-2">
          {["w-4/5", "w-3/5"].map((w, i) => (
            <Skeleton key={i} className={`h-3.5 rounded ${w}`} />
          ))}
        </div>
      </div>
    );
  }

  const { inProgressTasks } = preview;

  return (
    <Card title="진행중 태스크" meta={inProgressTasks.length > 0 ? `${inProgressTasks.length}건` : undefined}>
      {inProgressTasks.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {inProgressTasks.map((t) => (
            <li key={t.seq} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 text-muted-foreground">#{t.seq}</span>
              <span className="text-foreground">{t.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">진행중인 태스크가 없어요.</p>
      )}
    </Card>
  );
}

// ── 3. Recommended section ────────────────────────────────────────────────────

function RecommendedSection({ preview }: { preview: BriefPreviewData | undefined }) {
  if (preview === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="mb-3 h-4 w-24 rounded" />
        <div className="flex flex-col gap-2">
          {["w-4/5", "w-3/5"].map((w, i) => (
            <Skeleton key={i} className={`h-3.5 rounded ${w}`} />
          ))}
        </div>
      </div>
    );
  }

  const { recommendedTasks } = preview;

  return (
    <Card title="추천 작업">
      {recommendedTasks.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {recommendedTasks.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
              <span className="text-foreground">{t.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">추천 작업을 계산 중이에요.</p>
      )}
    </Card>
  );
}

// ── 4. Key decisions panel ────────────────────────────────────────────────────

function KeyDecisionsPanel({ projectId }: { projectId: string }) {
  const [decisions, setDecisions] = useState<KeyDecisionRecord[] | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<KeyDecisionRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProjectKeyDecisionsAction(projectId)
      .then((r) => { if (!cancelled) setDecisions(r.decisions); })
      .catch(() => { if (!cancelled) setDecisions([]); });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      let cancelled = false;
      recallKeyDecisionsAction(projectId, query.trim())
        .then((r) => { if (!cancelled) { setSearchResults(r); setSearching(false); } })
        .catch(() => { if (!cancelled) { setSearchResults([]); setSearching(false); } });
      return () => { cancelled = true; };
    }, 300);
    return () => clearTimeout(timer);
  }, [projectId, query]);

  const filtered = searchResults ?? decisions ?? [];

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <p className="text-sm font-semibold text-foreground">핵심 결정</p>
        {decisions !== undefined && decisions.length > 0 && (
          <span className="text-xs text-muted-foreground">{decisions.length}건</span>
        )}
      </div>
      <div className="border-t border-border">
        {decisions === undefined ? (
          <div className="flex flex-col gap-2 p-4">
            {["w-4/5", "w-3/5", "w-11/12"].map((w, i) => (
              <Skeleton key={i} className={`h-4 rounded ${w}`} />
            ))}
          </div>
        ) : (
          <>
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                {searching ? (
                  <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                )}
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="결정 검색..."
                  className="w-full rounded-full border border-border bg-muted py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {query ? "검색 결과가 없어요." : "아직 기록된 결정이 없어요."}
              </p>
            ) : (
              <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
                {filtered.map((task) => (
                  <div key={task.seq} className="px-4 py-2.5">
                    <p className="mb-1 text-sm font-medium text-foreground">
                      <span className="mr-1.5 text-muted-foreground">#{task.seq}</span>
                      {task.title}
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      {task.keyDecisions.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-foreground">
                          <span className="mt-0.5 shrink-0 text-muted-foreground">·</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── BrainTab ──────────────────────────────────────────────────────────────────

export function BrainTab({ selected }: { selected: Project }) {
  const [preview, setPreview] = useState<BriefPreviewData | undefined>();
  const [contextEditOpen, setContextEditOpen] = useState(false);

  const loadPreview = useCallback(() => {
    getBriefPreviewAction(selected.id)
      .then(setPreview)
      .catch(() =>
        setPreview({ context: null, inProgressTasks: [], recentKeyDecisions: [], recommendedTasks: [] }),
      );
  }, [selected.id]);

  useEffect(() => {
    let cancelled = false;
    getBriefPreviewAction(selected.id)
      .then((d) => { if (!cancelled) setPreview(d); })
      .catch(() => {
        if (!cancelled)
          setPreview({ context: null, inProgressTasks: [], recentKeyDecisions: [], recommendedTasks: [] });
      });
    return () => { cancelled = true; };
  }, [selected.id]);

  return (
    <div className="flex flex-col gap-4">
      <ContextSection preview={preview} onEditRequest={() => setContextEditOpen(true)} />
      <div className="grid gap-4 md:grid-cols-2">
        <InProgressSection preview={preview} />
        <RecommendedSection preview={preview} />
      </div>
      <KeyDecisionsPanel projectId={selected.id} />
      <ContextEditModal
        projectId={selected.id}
        open={contextEditOpen}
        onOpenChange={setContextEditOpen}
        onSaved={loadPreview}
      />
    </div>
  );
}
