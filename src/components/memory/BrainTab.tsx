"use client";

import { ChevronDown, ChevronUp, Loader2, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { BriefPreviewData } from "@/app/actions/getBriefPreviewAction";
import { getBriefPreviewAction } from "@/app/actions/getBriefPreviewAction";
import { getMemoryContextAction } from "@/app/actions/getMemoryContextAction";
import { getMemoryReflectionsAction } from "@/app/actions/getMemoryReflectionsAction";
import { getProjectKeyDecisionsAction, type KeyDecisionRecord } from "@/app/actions/getProjectKeyDecisionsAction";
import { triggerMemoryReflectionAction } from "@/app/actions/triggerMemoryReflectionAction";
import {
  type UpdateMemoryContextInput,
  updateMemoryContextAction,
} from "@/app/actions/updateMemoryContextAction";
import type { Project } from "@/components/project/ProjectsContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgoLabel(date: Date | string | null): string {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (d === 0) return "오늘";
  if (d === 1) return "어제";
  return `${d}일 전`;
}

const INSIGHT_TYPE_LABEL: Record<string, string> = {
  pattern: "패턴",
  insight: "인사이트",
  risk: "위험",
};

const INSIGHT_TYPE_STYLE: Record<string, string> = {
  pattern: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  insight: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  risk: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

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
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/60">{description}</p>
        </div>
        {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
      </div>
      <div className="rounded-xl border border-border bg-card">{children}</div>
    </div>
  );
}

// ── 1. Brief preview ──────────────────────────────────────────────────────────

function BriefPreviewSection({ projectId }: { projectId: string }) {
  const [preview, setPreview] = useState<BriefPreviewData | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getBriefPreviewAction(projectId)
      .then((d) => { if (!cancelled) setPreview(d); })
      .catch(() => { if (!cancelled) setPreview({ context: null, inProgressTasks: [], recentKeyDecisions: [], recommendedTasks: [] }); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (preview === undefined) {
    return (
      <Section label="브레인 요약" description="에이전트가 세션 시작 시 받는 프로젝트 스냅샷">
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
    <Section label="브레인 요약" description="에이전트가 세션 시작 시 받는 프로젝트 스냅샷">
      <div className="divide-y divide-border">
        {/* 맥락 */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">맥락</p>
          {hasContext ? (
            <div className="flex flex-col gap-1 text-sm text-foreground/70">
              {context.serviceDescription && <span><span className="text-muted-foreground">서비스: </span>{context.serviceDescription}</span>}
              {context.techStack && <span><span className="text-muted-foreground">기술: </span>{context.techStack}</span>}
              {context.targetUsers && <span><span className="text-muted-foreground">대상: </span>{context.targetUsers}</span>}
              {context.currentGoal && <span><span className="text-muted-foreground">목표: </span>{context.currentGoal}</span>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/50">맥락이 아직 없어요. 아래 폼에서 입력해 주세요.</p>
          )}
        </div>

        {/* 진행중 태스크 */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">진행중 태스크</p>
          {inProgressTasks.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {inProgressTasks.map((t) => (
                <li key={t.seq} className="flex items-start gap-1.5 text-sm text-foreground/70">
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">최근 핵심 결정</p>
          {recentKeyDecisions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentKeyDecisions.map((t) => (
                <div key={t.seq}>
                  <p className="mb-0.5 text-sm font-medium text-foreground/60">
                    <span className="mr-1 text-muted-foreground">#{t.seq}</span>{t.title}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {t.keyDecisions.slice(0, 2).map((d, i) => (
                      <li key={i} className="flex items-start gap-1 text-sm text-foreground/50">
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">추천 작업</p>
          {recommendedTasks.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {recommendedTasks.map((t, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-foreground/70">
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
    </Section>
  );
}

// ── 2. Context edit form ──────────────────────────────────────────────────────

type ContextFields = Omit<UpdateMemoryContextInput, "projectId">;

const CONTEXT_FIELDS: Array<{ key: keyof ContextFields; label: string; placeholder: string }> = [
  { key: "serviceDescription", label: "서비스 설명", placeholder: "이 프로젝트는 무엇을 하는 서비스인가요?" },
  { key: "techStack", label: "기술 스택", placeholder: "Next.js, Prisma, Neon DB, Gemini..." },
  { key: "targetUsers", label: "대상 유저", placeholder: "누구를 위한 서비스인가요?" },
  { key: "currentGoal", label: "현재 목표", placeholder: "지금 단계에서 달성하려는 것은?" },
];

function ContextEditForm({ projectId }: { projectId: string }) {
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
    let cancelled = false;
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
  }, [projectId]);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateMemoryContextAction({ projectId, ...fields });
      if (result.ok) {
        setSaved(fields);
        toast.success("맥락이 저장됐어요.");
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
    <Section label="맥락" description="에이전트가 항상 알고 있는 프로젝트 헌법">
      {loading ? (
        <div className="flex flex-col gap-2 p-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-0 divide-y divide-border">
          {CONTEXT_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="px-4 py-3">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {label}
              </label>
              <textarea
                value={fields[key]}
                onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                rows={2}
                className="w-full resize-none rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
          <div className="flex justify-end px-4 py-3">
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity disabled:opacity-40"
            >
              {saving && <Loader2 className="size-3 animate-spin" />}
              저장
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ── 3. Key decisions panel ────────────────────────────────────────────────────

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
    <Section label="핵심 결정" description="recall()로 검색 가능한 기억 단위">
      {decisions === undefined ? (
        <div className="flex flex-col gap-2 p-4">
          {["w-4/5", "w-3/5", "w-11/12"].map((w, i) => (
            <Skeleton key={i} className={`h-4 rounded ${w}`} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="결정 검색..."
              className="w-full bg-transparent py-2.5 pl-8 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {query ? "검색 결과가 없어요." : "아직 기록된 결정이 없어요."}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {filtered.map((task) => (
                <div key={task.seq} className="px-4 py-2.5">
                  <p className="mb-1 text-sm font-medium text-foreground/70">
                    <span className="mr-1.5 text-muted-foreground">#{task.seq}</span>
                    {task.title}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {task.keyDecisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-foreground/60">
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

// ── 4. Insights section ───────────────────────────────────────────────────────

function InsightsSection({ projectId }: { projectId: string }) {
  const [reflections, setReflections] = useState<MemoryReflectionRecord[] | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMemoryReflectionsAction(projectId, 3)
      .then((r) => { if (!cancelled) setReflections(r); })
      .catch(() => { if (!cancelled) setReflections([]); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleTrigger(e: React.MouseEvent) {
    e.stopPropagation();
    setTriggering(true);
    try {
      const result = await triggerMemoryReflectionAction(projectId);
      setReflections((prev) => [result, ...(prev ?? [])]);
      setExpanded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "분석에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setTriggering(false);
    }
  }

  if (reflections === undefined) {
    return (
      <Section label="인사이트" description="완료된 태스크에서 AI가 발견한 패턴과 위험">
        <Skeleton className="m-4 h-16 w-auto rounded-lg" />
      </Section>
    );
  }

  if (reflections.length === 0) {
    return (
      <Section label="인사이트" description="완료된 태스크에서 AI가 발견한 패턴과 위험">
        <div className="flex items-center gap-3 px-4 py-4">
          <Sparkles className="size-4 shrink-0 text-amber-400 opacity-60" />
          <p className="flex-1 text-sm text-muted-foreground">
            아직 AI 분석이 없어요.
          </p>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="shrink-0 flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-400"
          >
            {triggering ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            지금 분석
          </button>
        </div>
      </Section>
    );
  }

  const latest = reflections[0];
  const hasInsights = latest.insights.length > 0;
  const hasSuggestedTasks = latest.suggestedTasks.length > 0;

  return (
    <Section
      label="인사이트"
      description="완료된 태스크에서 AI가 발견한 패턴과 위험"
      meta={`${daysAgoLabel(latest.createdAt)} · ${latest.analyzedTaskCount}개 태스크`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Sparkles className="size-3.5 shrink-0 text-amber-500" />
        <span className="flex-1 text-sm text-foreground/80 leading-snug">
          {latest.contextSummary ?? "분석 완료"}
        </span>
        {expanded
          ? <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (hasInsights || hasSuggestedTasks) && (
        <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">
          {hasInsights && (
            <div className="flex flex-col gap-1.5">
              {latest.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={cn(
                    "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    INSIGHT_TYPE_STYLE[ins.type] ?? INSIGHT_TYPE_STYLE.insight,
                  )}>
                    {INSIGHT_TYPE_LABEL[ins.type] ?? ins.type}
                  </span>
                  <span className="text-sm text-foreground/70">{ins.text}</span>
                </div>
              ))}
            </div>
          )}

          {hasSuggestedTasks && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">추천 작업</p>
              {latest.suggestedTasks.map((t, i) => (
                <div key={i} className="flex items-start gap-1.5 text-sm">
                  <span className="mt-0.5 shrink-0 text-muted-foreground">·</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-foreground/70">{t.title}</span>
                    {t.reason && <span className="text-muted-foreground"> — {t.reason}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="self-start flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {triggering ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            다시 분석
          </button>
        </div>
      )}
    </Section>
  );
}

// ── BrainTab ──────────────────────────────────────────────────────────────────

export function BrainTab({ selected }: { selected: Project }) {
  const [totalDecisionCount, setTotalDecisionCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    getProjectKeyDecisionsAction(selected.id)
      .then((r) => { if (!cancelled) setTotalDecisionCount(r.totalDecisionCount); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selected.id]);

  return (
    <div className="flex flex-col gap-6">
      <BriefPreviewSection projectId={selected.id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContextEditForm projectId={selected.id} />
        <KeyDecisionsPanel projectId={selected.id} />
      </div>

      {totalDecisionCount >= 30 && (
        <InsightsSection projectId={selected.id} />
      )}
    </div>
  );
}
