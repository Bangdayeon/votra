"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getProjectAiSummaryAction } from "@/app/actions/getProjectAiSummary";
import type { TaskRecord } from "@/app/actions/getProjectTasks";
import type { CachedProjectAiSummary } from "@/application/getCachedProjectAiSummary";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import type { Project } from "@/components/project/ProjectsContext";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewTab({
  selected,
  initialOverview,
  initialTasks,
}: {
  selected: Project;
  initialOverview?: { aiSummary: CachedProjectAiSummary };
  initialTasks?: TaskRecord[];
}) {
  const [aiSummary, setAiSummary] = useState<CachedProjectAiSummary>(
    initialOverview?.aiSummary ?? null,
  );
  const [aiLoading, setAiLoading] = useState(!initialOverview);
  const skipFirst = useRef(!!initialOverview);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    let cancelled = false;
    setAiLoading(true);
    getProjectAiSummaryAction(selected.id)
      .then((s) => { if (!cancelled) setAiSummary(s); })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "AI 요약을 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled) setAiLoading(false); });
    return () => { cancelled = true; };
  }, [selected.id]);

  const tasks = initialTasks ?? [];
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
  const pending = tasks.filter((t) => t.status === "PENDING");
  const previewTasks = [...inProgress, ...pending].slice(0, 3);

  const nextTasks = aiSummary?.nextTasks ?? [];

  return (
    <div className="flex pb-6 flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">현재 태스크</p>
        {previewTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">진행 중이거나 대기 중인 태스크가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {previewTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 min-w-0">
                <StatusBadge status={t.status} />
                <span className="text-xs text-muted-foreground shrink-0">#{t.seq}</span>
                <span className="text-sm text-foreground truncate">{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI 제안</p>
        {aiLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : nextTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brain 탭에서 AI 분석을 실행해 주세요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {nextTasks.map((task, i) => (
              <li key={i} className="flex items-center gap-2 min-w-0">
                <PriorityBadge priority={task.priority} />
                <span className="text-sm text-foreground truncate">{task.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "IN_PROGRESS") {
    return (
      <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        진행중
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      대기
    </span>
  );
}
