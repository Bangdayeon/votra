"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getProjectAiSummaryAction } from "@/app/actions/getProjectAiSummary";
import { refreshProjectAiSummaryAction } from "@/app/actions/refreshProjectAiSummary";
import type { CachedProjectAiSummary } from "@/application/getCachedProjectAiSummary";
import { AiSummaryCard } from "@/components/overview/AiSummaryCard";
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
  initialOverview?: { aiSummary: CachedProjectAiSummary };
}) {
  const [aiSummary, setAiSummary] = useState<CachedProjectAiSummary>(
    initialOverview?.aiSummary ?? null,
  );
  const [aiLoading, setAiLoading] = useState(!initialOverview);
  const { refreshing: aiRefreshing, run: runAiRefresh } = useRefreshWithToast();

  const skipFirst = useRef(!!initialOverview);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
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

  const onRefresh = useCallback(
    () =>
      runAiRefresh(() => refreshProjectAiSummaryAction(selected.id), {
        onSuccess: setAiSummary,
        successMessage: "AI 분석이 업데이트됐어요.",
        defaultErrorMessage: "AI 분석에 실패했어요.",
      }),
    [selected.id, runAiRefresh],
  );

  // 캐시가 없는 경우(= 프로젝트 첫 추가)에만 자동 분석
  useEffect(() => {
    const key = `haema-ai-init-${selected.id}`;
    if (aiLoading || aiRefreshing) return;
    if (aiSummary !== null || isInitialized(key)) return;

    markInitialized(key);
    void onRefresh();
  }, [aiLoading, aiRefreshing, aiSummary, selected.id, onRefresh]);

  return (
    <div className="flex pb-6 flex-col gap-6">
      <AiSummaryCard
        summary={aiSummary?.summary}
        warnings={aiSummary?.warnings}
        nextTasks={aiSummary?.nextTasks}
        refreshedAt={aiSummary?.refreshedAt}
        loading={aiLoading}
        refreshing={aiRefreshing}
        onRefresh={selected.isOwner ? onRefresh : undefined}
      />
    </div>
  );
}
