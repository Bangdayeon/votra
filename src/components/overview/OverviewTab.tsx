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

export function OverviewTab({ selected }: { selected: Project }) {
  const [aiSummary, setAiSummary] = useState<CachedProjectAiSummary>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const autoRefreshAttempted = useRef(false);

  const [nextTasks, setNextTasks] = useState<CachedProjectNextTasks>(null);
  const [nextTasksLoading, setNextTasksLoading] = useState(false);
  const [nextTasksRefreshing, setNextTasksRefreshing] = useState(false);
  const autoNextTaskAttempted = useRef(false);

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

  const onRefreshAi = useCallback(async () => {
    setAiRefreshing(true);
    try {
      const next = await refreshProjectAiSummaryAction(selected.id);
      setAiSummary(next);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "AI 분석에 실패했어요.",
      );
    } finally {
      setAiRefreshing(false);
    }
  }, [selected.id]);

  const onRefreshNextTasks = useCallback(async () => {
    setNextTasksRefreshing(true);
    try {
      const next = await refreshProjectNextTasksAction(selected.id);
      setNextTasks(next);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "추천 작업 분석에 실패했어요.",
      );
    } finally {
      setNextTasksRefreshing(false);
    }
  }, [selected.id]);

  useEffect(() => {
    if (
      !aiLoading &&
      aiSummary === null &&
      !aiRefreshing &&
      !autoRefreshAttempted.current
    ) {
      autoRefreshAttempted.current = true;
      void onRefreshAi();
    }
  }, [aiLoading, aiSummary, aiRefreshing, onRefreshAi]);

  useEffect(() => {
    if (
      !nextTasksLoading &&
      nextTasks === null &&
      !nextTasksRefreshing &&
      !autoNextTaskAttempted.current
    ) {
      autoNextTaskAttempted.current = true;
      void onRefreshNextTasks();
    }
  }, [nextTasksLoading, nextTasks, nextTasksRefreshing, onRefreshNextTasks]);

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
