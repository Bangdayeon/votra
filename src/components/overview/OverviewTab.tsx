"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getProjectAiSummaryAction } from "@/app/actions/getProjectAiSummary";
import type { TaskRecord } from "@/app/actions/getProjectTasks";
import { refreshProjectNextTasksAction } from "@/app/actions/refreshProjectNextTasks";
import type { CachedProjectAiSummary } from "@/application/getCachedProjectAiSummary";
import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { AgentCommandBox } from "@/components/common/AgentCommandBox";
import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
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
  const [nextTasksRefreshing, setNextTasksRefreshing] = useState(false);
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

  async function handleRefreshNextTasks() {
    setNextTasksRefreshing(true);
    try {
      const result = await refreshProjectNextTasksAction(selected.id);
      setAiSummary((prev) =>
        prev ? { ...prev, nextTasks: result.tasks, refreshedAt: result.refreshedAt } : prev,
      );
      toast.success("제안 작업이 업데이트됐어요.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "제안 작업 업데이트에 실패했어요.");
    } finally {
      setNextTasksRefreshing(false);
    }
  }

  const tasks = initialTasks ?? [];
  const previewTasks = [
    ...tasks.filter((t) => t.status === "IN_PROGRESS"),
    ...tasks.filter((t) => t.status === "PENDING"),
  ].slice(0, 3);

  const nextTasks = aiSummary?.nextTasks ?? [];

  return (
    <div className="flex pb-6 flex-col gap-6">
      <Card>
        <h3 className="text-xl font-semibold">현재 태스크</h3>
        <section className="mt-4">
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
        </section>
      </Card>

      <Card>
        <CardRefreshHeader
          title="💬 제안 작업"
          refreshedAt={aiSummary?.refreshedAt ?? null}
          loading={aiLoading}
          refreshing={nextTasksRefreshing}
          onRefresh={selected.isOwner ? handleRefreshNextTasks : undefined}
        />
        <section className="mt-4">
          {aiLoading ? (
            <ul className="flex flex-col gap-4">
              {[0, 1].map((i) => (
                <li key={i} className="flex flex-col items-start gap-1.5">
                  <div className="flex gap-1.5">
                    <Skeleton className="h-4 w-7 rounded" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-3 w-2/3" />
                </li>
              ))}
            </ul>
          ) : nextTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brain 탭에서 AI 분석을 실행해 주세요.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {nextTasks.map((task, i) => (
                <NextTaskItem key={i} task={task} />
              ))}
            </ul>
          )}
        </section>
      </Card>
    </div>
  );
}

function NextTaskItem({ task }: { task: NextTask }) {
  return (
    <li className="flex flex-col items-start gap-1.5">
      <div className="flex gap-1.5">
        <PriorityBadge priority={task.priority} />
        <span className="text-sm font-medium text-foreground">{task.title}</span>
      </div>
      {task.agentCommand && <AgentCommandBox command={task.agentCommand} className="w-full" />}
    </li>
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
