"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";

import { getMemoryReflectionsAction } from "@/app/actions/getMemoryReflectionsAction";
import { triggerMemoryReflectionAction } from "@/app/actions/triggerMemoryReflectionAction";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  pattern: "패턴",
  insight: "인사이트",
  risk: "위험",
};

const TYPE_STYLE: Record<string, string> = {
  pattern: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  insight: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  risk: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function MemoryInsightFeed({
  projectId,
  initialReflections,
}: {
  projectId: string;
  initialReflections?: MemoryReflectionRecord[];
}) {
  const [reflections, setReflections] = useState<MemoryReflectionRecord[]>(initialReflections ?? []);
  const [loaded, setLoaded] = useState(!!initialReflections);
  const [expanded, setExpanded] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (initialReflections) return;
    getMemoryReflectionsAction(projectId, 3)
      .then(setReflections)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [projectId, initialReflections]);

  async function handleTrigger(e: React.MouseEvent) {
    e.stopPropagation();
    setTriggering(true);
    try {
      const result = await triggerMemoryReflectionAction(projectId);
      setReflections((prev) => [result, ...prev]);
      setExpanded(true);
    } catch {
      // 분석 실패는 조용히 무시
    } finally {
      setTriggering(false);
    }
  }

  if (!loaded) return null;

  // 빈 상태
  if (reflections.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-dashed border-amber-200 bg-amber-50/30 dark:border-amber-800/30 dark:bg-amber-900/5 px-4 py-3 flex items-center gap-3">
        <Sparkles className="size-4 shrink-0 text-amber-400" />
        <p className="flex-1 text-xs text-amber-700/70 dark:text-amber-400/60">
          AI 메모리 분석이 아직 없어요. 태스크를 완료하면 자동으로 생성되거나, 지금 바로 실행할 수 있어요.
        </p>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="shrink-0 flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
        >
          {triggering ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
          지금 분석
        </button>
      </div>
    );
  }

  const latest = reflections[0];
  const hasContent = latest.contextSummary || latest.insights.length > 0 || latest.suggestedTasks.length > 0;

  if (!hasContent) return null;

  const daysAgo = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const dateLabel = daysAgo === 0 ? "오늘" : `${daysAgo}일 전`;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Sparkles className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
          AI 메모리 분석
        </span>
        <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
          {dateLabel} · {latest.analyzedTaskCount}개 태스크
        </span>
        {expanded
          ? <ChevronUp className="size-4 text-amber-600 dark:text-amber-400" />
          : <ChevronDown className="size-4 text-amber-600 dark:text-amber-400" />}
      </button>

      {expanded && (
        <div className="border-t border-amber-200 dark:border-amber-800/40 px-4 pb-4 pt-3 flex flex-col gap-3">
          {latest.contextSummary && (
            <p className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
              {latest.contextSummary}
            </p>
          )}

          {latest.insights.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {latest.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={cn(
                    "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    TYPE_STYLE[ins.type] ?? TYPE_STYLE.insight,
                  )}>
                    {TYPE_LABEL[ins.type] ?? ins.type}
                  </span>
                  <span className="text-xs text-foreground/80">{ins.text}</span>
                </div>
              ))}
            </div>
          )}

          {latest.suggestedTasks.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-amber-800/70 dark:text-amber-300/70">추천 작업</p>
              {latest.suggestedTasks.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 shrink-0 text-amber-500">·</span>
                  <span className="text-foreground/80">{t.title}</span>
                  <span className="text-muted-foreground shrink-0">— {t.reason}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="self-start flex items-center gap-1 text-xs text-amber-600/60 hover:text-amber-700 disabled:opacity-50 dark:text-amber-400/50 dark:hover:text-amber-400"
          >
            {triggering ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            다시 분석
          </button>
        </div>
      )}
    </div>
  );
}
