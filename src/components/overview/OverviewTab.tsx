"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getProjectAiSummaryAction } from "@/app/actions/getProjectAiSummary";
import { getProjectNextTasksAction } from "@/app/actions/getProjectNextTasks";
import { refreshProjectAiSummaryAction } from "@/app/actions/refreshProjectAiSummary";
import { refreshProjectNextTasksAction } from "@/app/actions/refreshProjectNextTasks";
import type { CachedProjectAiSummary } from "@/application/getCachedProjectAiSummary";
import type { CachedProjectNextTasks } from "@/application/getCachedProjectNextTasks";
import { AiSummaryCard } from "@/components/overview/AiSummaryCard";
import { RecommendedNextTaskCard } from "@/components/overview/RecommendedNextTaskCard";
import type { Project } from "@/components/project/ProjectsContext";
import { useRefreshWithToast } from "@/hooks/useRefreshWithToast";

function markInitialized(key: string) {
  localStorage.setItem(key, "1");
}

function isInitialized(key: string) {
  return Boolean(localStorage.getItem(key));
}

export function OverviewTab({
  selected,
  initialOverview,
}: {
  selected: Project;
  initialOverview?: { aiSummary: CachedProjectAiSummary; nextTasks: CachedProjectNextTasks };
}) {
  const [aiSummary, setAiSummary] = useState<CachedProjectAiSummary>(
    initialOverview?.aiSummary ?? null,
  );
  const [aiLoading, setAiLoading] = useState(!initialOverview);
  const { refreshing: aiRefreshing, run: runAiRefresh } = useRefreshWithToast();

  const [nextTasks, setNextTasks] = useState<CachedProjectNextTasks>(
    initialOverview?.nextTasks ?? null,
  );
  const [nextTasksLoading, setNextTasksLoading] = useState(!initialOverview);
  const { refreshing: nextTasksRefreshing, run: runNextTasksRefresh } =
    useRefreshWithToast();

  const skipFirstAi = useRef(!!initialOverview);
  const skipFirstNextTasks = useRef(!!initialOverview);

  useEffect(() => {
    if (skipFirstAi.current) { skipFirstAi.current = false; return; }
    let cancelled = false;
    setAiLoading(true);
    getProjectAiSummaryAction(selected.id)
      .then((s) => {
        if (!cancelled) setAiSummary(s);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "AI 요약을 불러오지 못했어요.",
        );
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id]);

  useEffect(() => {
    if (skipFirstNextTasks.current) { skipFirstNextTasks.current = false; return; }
    let cancelled = false;
    setNextTasksLoading(true);
    getProjectNextTasksAction(selected.id)
      .then((t) => {
        if (!cancelled) setNextTasks(t);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "추천 작업을 불러오지 못했어요.",
        );
      })
      .finally(() => {
        if (!cancelled) setNextTasksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id]);

  const onRefreshAi = useCallback(
    () =>
      runAiRefresh(() => refreshProjectAiSummaryAction(selected.id), {
        onSuccess: setAiSummary,
        successMessage: "AI 요약이 업데이트됐어요.",
        defaultErrorMessage: "AI 분석에 실패했어요.",
      }),
    [selected.id, runAiRefresh],
  );

  const onRefreshNextTasks = useCallback(
    () =>
      runNextTasksRefresh(() => refreshProjectNextTasksAction(selected.id), {
        onSuccess: setNextTasks,
        successMessage: "추천 작업이 업데이트됐어요.",
        defaultErrorMessage: "추천 작업 분석에 실패했어요.",
      }),
    [selected.id, runNextTasksRefresh],
  );

  // 캐시가 없는 경우(= 프로젝트 첫 추가)에만 자동 분석. localStorage로 추적해
  // 탭 전환·페이지 새로고침 시 재실행되지 않게 한다.
  // 두 호출을 순차 실행해서 동시 LLM 연결로 인한 HTTP 연결 풀 포화를 방지한다.
  useEffect(() => {
    const summaryKey = `votra-ai-init-${selected.id}`;
    const tasksKey = `votra-tasks-init-${selected.id}`;
    if (aiLoading || nextTasksLoading || aiRefreshing || nextTasksRefreshing) return;

    const needsSummary = aiSummary === null && !isInitialized(summaryKey);
    const needsTasks = (nextTasks === null || nextTasks.tasks.length === 0) && !isInitialized(tasksKey);

    let mounted = true;
    if (needsSummary) {
      markInitialized(summaryKey);
      void onRefreshAi().then(() => {
        if (mounted && needsTasks) {
          markInitialized(tasksKey);
          void onRefreshNextTasks();
        }
      });
    } else if (needsTasks) {
      markInitialized(tasksKey);
      void onRefreshNextTasks();
    }
    return () => { mounted = false; };
  }, [aiLoading, nextTasksLoading, aiRefreshing, nextTasksRefreshing, aiSummary, nextTasks, selected.id, onRefreshAi, onRefreshNextTasks]);

  return (
    <div className="flex pb-6 flex-col gap-6">
      <AiSummaryCard
        summary={aiSummary?.summary}
        refreshedAt={aiSummary?.refreshedAt}
        loading={aiLoading}
        refreshing={aiRefreshing}
        onRefresh={selected.isOwner ? onRefreshAi : undefined}
      />
      <RecommendedNextTaskCard
        tasks={nextTasks?.tasks}
        refreshedAt={nextTasks?.refreshedAt}
        loading={nextTasksLoading}
        refreshing={nextTasksRefreshing}
        onRefresh={selected.isOwner ? onRefreshNextTasks : undefined}
      />
    </div>
  );
}
