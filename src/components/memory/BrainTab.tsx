"use client";

import { Loader2, Pencil, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { BriefPreviewData } from "@/app/actions/getBriefPreviewAction";
import { getBriefPreviewAction } from "@/app/actions/getBriefPreviewAction";
import { getMemoryContextAction } from "@/app/actions/getMemoryContextAction";
import { getProjectKeyDecisionsAction, type KeyDecisionRecord } from "@/app/actions/getProjectKeyDecisionsAction";
import {
  type UpdateMemoryContextInput,
  updateMemoryContextAction,
} from "@/app/actions/updateMemoryContextAction";
import { IntegrationsPanel } from "@/components/memory/IntegrationsPanel";
import type { Project } from "@/components/project/ProjectsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgoLabel(date: Date | string | null): string {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (d === 0) return "오늘";
  if (d === 1) return "어제";
  return `${d}일 전`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  label,
  description,
  meta,
  children,
}: {
  label: string;
  description: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
      </div>
      <div className="rounded-xl border border-border bg-card">{children}</div>
    </div>
  );
}

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

// ── 1. Brief preview ──────────────────────────────────────────────────────────

function BriefPreviewSection({ projectId }: { projectId: string }) {
  const [preview, setPreview] = useState<BriefPreviewData | undefined>(undefined);
  const [contextEditOpen, setContextEditOpen] = useState(false);

  const loadPreview = useCallback(() => {
    getBriefPreviewAction(projectId)
      .then((d) => setPreview(d))
      .catch(() => setPreview({ context: null, inProgressTasks: [], recentKeyDecisions: [], recommendedTasks: [] }));
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    getBriefPreviewAction(projectId)
      .then((d) => { if (!cancelled) setPreview(d); })
      .catch(() => { if (!cancelled) setPreview({ context: null, inProgressTasks: [], recentKeyDecisions: [], recommendedTasks: [] }); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (preview === undefined) {
    return (
      <Section label="프로젝트 브리핑" description="에이전트가 세션 시작 시 받는 프로젝트 스냅샷">
        <div className="flex flex-col gap-2 p-4">
          {["w-4/5", "w-3/5", "w-11/12"].map((w, i) => (
            <Skeleton key={i} className={`h-4 rounded ${w}`} />
          ))}
        </div>
      </Section>
    );
  }

  const { context, inProgressTasks, recentKeyDecisions, recommendedTasks } = preview;
  const hasContext = context && (context.serviceDescription || context.techStack || context.targetUsers || context.currentGoal);

  return (
    <Section label="프로젝트 브리핑" description="에이전트가 매 세션마다 받는 프로젝트 스냅샷이에요.">
      <div className="divide-y divide-border">
        {/* 맥락 */}
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">맥락</p>
            <button
              onClick={() => setContextEditOpen(true)}
              className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
              aria-label="맥락 편집"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
          {hasContext ? (
            <div className="flex flex-col gap-1 text-sm text-foreground">
              {context.serviceDescription && <span><span className="text-muted-foreground">서비스: </span>{context.serviceDescription}</span>}
              {context.techStack && <span><span className="text-muted-foreground">기술: </span>{context.techStack}</span>}
              {context.targetUsers && <span><span className="text-muted-foreground">대상: </span>{context.targetUsers}</span>}
              {context.currentGoal && <span><span className="text-muted-foreground">목표: </span>{context.currentGoal}</span>}
            </div>
          ) : (
            <button
              onClick={() => setContextEditOpen(true)}
              className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              맥락을 입력해 주세요 →
            </button>
          )}
        </div>

        {/* 진행중 태스크 */}
        <div className="px-4 py-3">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">진행중 태스크</p>
          {inProgressTasks.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {inProgressTasks.map((t) => (
                <li key={t.seq} className="flex items-start gap-1.5 text-sm text-foreground">
                  <span className="shrink-0 text-muted-foreground">#{t.seq}</span>
                  {t.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground/50">진행중인 태스크가 없어요.</p>
          )}
        </div>

        {/* 최근 핵심 결정 */}
        <div className="px-4 py-3">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">최근 핵심 결정</p>
          {recentKeyDecisions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentKeyDecisions.map((t) => (
                <div key={t.seq}>
                  <p className="mb-0.5 text-sm font-medium text-foreground">
                    <span className="mr-1 text-muted-foreground">#{t.seq}</span>{t.title}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {t.keyDecisions.slice(0, 2).map((d, i) => (
                      <li key={i} className="flex items-start gap-1 text-sm text-foreground">
                        <span className="shrink-0">·</span>{d}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/50">아직 기록된 결정이 없어요.</p>
          )}
        </div>

        {/* 추천 작업 */}
        <div className="px-4 py-3">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">추천 작업</p>
          {recommendedTasks.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {recommendedTasks.map((t, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-foreground">
                  <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                  <span>{t.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground/50">추천 작업을 계산 중이에요.</p>
          )}
        </div>
      </div>

      <ContextEditModal
        projectId={projectId}
        open={contextEditOpen}
        onOpenChange={setContextEditOpen}
        onSaved={loadPreview}
      />
    </Section>
  );
}

// ── 2. Key decisions panel ────────────────────────────────────────────────────

function KeyDecisionsPanel({ projectId }: { projectId: string }) {
  const [decisions, setDecisions] = useState<KeyDecisionRecord[] | undefined>(undefined);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    getProjectKeyDecisionsAction(projectId)
      .then((r) => { if (!cancelled) setDecisions(r.decisions); })
      .catch(() => { if (!cancelled) setDecisions([]); });
    return () => { cancelled = true; };
  }, [projectId]);

  const filtered = (decisions ?? []).filter((t) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.keyDecisions.some((d) => d.toLowerCase().includes(q));
  });

  return (
    <Section label="핵심 결정" description="태스크 완료 시 저장된 핵심 결정을 검색하고 확인해요.">
      {decisions === undefined ? (
        <div className="flex flex-col gap-2 p-4">
          {["w-4/5", "w-3/5", "w-11/12"].map((w, i) => (
            <Skeleton key={i} className={`h-4 rounded ${w}`} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
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
        </div>
      )}
    </Section>
  );
}

// ── BrainTab ──────────────────────────────────────────────────────────────────

export function BrainTab({ selected }: { selected: Project }) {
  return (
    <div className="flex flex-col gap-6">
      <BriefPreviewSection projectId={selected.id} />
      <KeyDecisionsPanel projectId={selected.id} />
      <IntegrationsPanel projectId={selected.id} isOwner={selected.isOwner ?? false} />
    </div>
  );
}
