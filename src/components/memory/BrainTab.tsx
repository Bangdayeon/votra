"use client";

import { BookOpen, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { getMemoryContextAction, type MemoryContextRecord } from "@/app/actions/getMemoryContextAction";
import { getMemoryReflectionsAction } from "@/app/actions/getMemoryReflectionsAction";
import { getProjectKeyDecisionsAction, type KeyDecisionRecord } from "@/app/actions/getProjectKeyDecisionsAction";
import { triggerMemoryReflectionAction } from "@/app/actions/triggerMemoryReflectionAction";
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
        {meta && <span className="shrink-0 text-[11px] text-muted-foreground">{meta}</span>}
      </div>
      <div className="rounded-xl border border-border bg-card">{children}</div>
    </div>
  );
}

// ── 1. Context section ────────────────────────────────────────────────────────

function ContextSection({ projectId }: { projectId: string }) {
  const [ctx, setCtx] = useState<MemoryContextRecord | null | undefined>(undefined);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMemoryContextAction(projectId)
      .then((c) => { if (!cancelled) setCtx(c); })
      .catch(() => { if (!cancelled) setCtx(null); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleTrigger() {
    setTriggering(true);
    try {
      await triggerMemoryReflectionAction(projectId);
      const updated = await getMemoryContextAction(projectId);
      setCtx(updated);
    } catch {
      // 실패 시 조용히 무시
    } finally {
      setTriggering(false);
    }
  }

  if (ctx === undefined) {
    return (
      <Section label="맥락" description="에이전트가 매 세션 기본으로 알고 있는 프로젝트 지식">
        <Skeleton className="m-4 h-20 w-auto rounded-lg" />
      </Section>
    );
  }

  if (!ctx) {
    return (
      <Section label="맥락" description="에이전트가 매 세션 기본으로 알고 있는 프로젝트 지식">
        <div className="flex items-center gap-3 px-4 py-5">
          <BookOpen className="size-4 shrink-0 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="flex-1 text-xs text-muted-foreground">
            아직 축적된 맥락이 없어요. 태스크를 완료하거나 지금 분석을 실행하면 생성돼요.
          </p>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="shrink-0 flex items-center gap-1 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            {triggering ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            지금 분석
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section
      label="맥락"
      description="에이전트가 매 세션 기본으로 알고 있는 프로젝트 지식"
      meta={`v${ctx.version} · ${daysAgoLabel(ctx.updatedAt)} 업데이트`}
    >
      <p className="px-4 py-3 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
        {ctx.content}
      </p>
    </Section>
  );
}

// ── 2. Key decisions section ──────────────────────────────────────────────────

function KeyDecisionsSection({ projectId }: { projectId: string }) {
  const [decisions, setDecisions] = useState<KeyDecisionRecord[] | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProjectKeyDecisionsAction(projectId)
      .then((d) => { if (!cancelled) setDecisions(d); })
      .catch(() => { if (!cancelled) setDecisions([]); });
    return () => { cancelled = true; };
  }, [projectId]);

  const totalDecisions = decisions?.reduce((acc, t) => acc + t.keyDecisions.length, 0) ?? 0;

  if (decisions === undefined) {
    return (
      <Section label="핵심 결정" description="태스크 완료 시 저장된 설계 결정 — recall()로 검색 가능">
        <div className="flex flex-col gap-2 p-4">
          {["w-4/5", "w-3/5", "w-11/12"].map((w, i) => (
            <Skeleton key={i} className={`h-4 rounded ${w}`} />
          ))}
        </div>
      </Section>
    );
  }

  if (decisions.length === 0) {
    return (
      <Section label="핵심 결정" description="태스크 완료 시 저장된 설계 결정 — recall()로 검색 가능">
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">
          아직 기록된 결정이 없어요.
        </p>
      </Section>
    );
  }

  return (
    <Section
      label="핵심 결정"
      description="태스크 완료 시 저장된 설계 결정 — recall()로 검색 가능"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="flex-1 text-sm text-foreground/80">
          결정 {totalDecisions}개 · {decisions.length}개 태스크
        </span>
        {expanded
          ? <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {decisions.map((task) => (
            <div key={task.seq} className="px-4 py-2.5">
              <p className="mb-1 text-xs font-medium text-foreground/70">
                <span className="mr-1.5 text-muted-foreground">#{task.seq}</span>
                {task.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {task.keyDecisions.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/60">
                    <span className="mt-0.5 shrink-0 text-muted-foreground">·</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── 3. Insights section ───────────────────────────────────────────────────────

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
    } catch {
      // 분석 실패는 조용히 무시
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
          <p className="flex-1 text-xs text-muted-foreground">
            아직 AI 분석이 없어요. 태스크를 완료하면 자동으로 생성돼요.
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
                  <span className="text-xs text-foreground/70">{ins.text}</span>
                </div>
              ))}
            </div>
          )}

          {hasSuggestedTasks && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">추천 작업</p>
              {latest.suggestedTasks.map((t, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs">
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
            className="self-start flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
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
  return (
    <div className="flex flex-col gap-6">
      <ContextSection projectId={selected.id} />
      <KeyDecisionsSection projectId={selected.id} />
      <InsightsSection projectId={selected.id} />
    </div>
  );
}
