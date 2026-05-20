"use client";

import { useCallback, useEffect, useState } from "react";
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

export function OverviewTab({ selected }: { selected: Project }) {
  const [aiSummary, setAiSummary] = useState<CachedProjectAiSummary>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { refreshing: aiRefreshing, run: runAiRefresh } = useRefreshWithToast();

  const [nextTasks, setNextTasks] = useState<CachedProjectNextTasks>(null);
  const [nextTasksLoading, setNextTasksLoading] = useState(false);
  const { refreshing: nextTasksRefreshing, run: runNextTasksRefresh } =
    useRefreshWithToast();

  useEffect(() => {
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
  useEffect(() => {
    const key = `votra-ai-init-${selected.id}`;
    if (!aiLoading && aiSummary === null && !isInitialized(key)) {
      markInitialized(key);
      void onRefreshAi();
    }
  }, [aiLoading, aiSummary, selected.id, onRefreshAi]);

  useEffect(() => {
    const key = `votra-tasks-init-${selected.id}`;
    if (!nextTasksLoading && (nextTasks === null || nextTasks.tasks.length === 0) && !isInitialized(key)) {
      markInitialized(key);
      void onRefreshNextTasks();
    }
  }, [nextTasksLoading, nextTasks, selected.id, onRefreshNextTasks]);

  return (
    <div className="flex pb-6 flex-col gap-6">
      <AiSummaryCard
        summary={aiSummary?.summary}
        suggestions={aiSummary?.suggestions}
        refreshedAt={aiSummary?.refreshedAt}
        loading={aiLoading}
        refreshing={aiRefreshing}
        onRefresh={onRefreshAi}
      />
      <RecommendedNextTaskCard
        tasks={nextTasks?.tasks}
        refreshedAt={nextTasks?.refreshedAt}
        loading={nextTasksLoading}
        refreshing={nextTasksRefreshing}
        onRefresh={onRefreshNextTasks}
      />
    </div>
  );
}
