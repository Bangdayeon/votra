"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getProjectAiSummaryAction } from "@/app/actions/getProjectAiSummary";
import { getProjectMetricsAction } from "@/app/actions/getProjectMetrics";
import { refreshProjectAiSummaryAction } from "@/app/actions/refreshProjectAiSummary";
import type { CachedProjectAiSummary } from "@/application/getCachedProjectAiSummary";
import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { Card } from "@/components/common/Card";
import { ClaudeFilesCard } from "@/components/claude-files/ClaudeFilesCard";
import { AiSummaryCard } from "@/components/overview/AiSummaryCard";
import { OtherMetricsCard } from "@/components/overview/OtherMetricsCard";
import type { Project } from "@/components/project/ProjectsContext";
import { SessionTokensCard } from "@/components/overview/SessionTokensCard";

export function OverviewTab({ selected }: { selected: Project }) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<CachedProjectAiSummary>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRefreshing, setAiRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMetricsLoading(true);
    getProjectMetricsAction(selected.id)
      .then((m) => {
        if (!cancelled) setMetrics(m);
      })
      .catch(() => {
        if (!cancelled) setMetrics(null);
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id]);

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

  return (
    <div className="flex pb-6 flex-col gap-6">
      <AiSummaryCard
        summary={aiSummary?.summary}
        warnings={aiSummary?.warnings}
        suggestions={aiSummary?.suggestions}
        refreshedAt={aiSummary?.refreshedAt}
        loading={aiLoading}
        refreshing={aiRefreshing}
        onRefresh={onRefreshAi}
      />

      <div className="flex flex-col lg:flex-row flex-1 gap-6">
        <ClaudeFilesCard selected={selected} />

        {metricsLoading && (
          <>
            <Card className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </Card>
            <Card className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </Card>
          </>
        )}

        {!metricsLoading && metrics && (
          <>
            <SessionTokensCard metrics={metrics} className="flex-1" />
            <OtherMetricsCard metrics={metrics} className="flex-1" />
          </>
        )}

        {!metricsLoading && !metrics && (
          <>
            <Card className="flex-1">
              <p className="text-sm text-muted-foreground">
                데이터를 불러오지 못했어요.
              </p>
            </Card>
            <Card className="flex-1">
              <p className="text-sm text-muted-foreground">
                데이터를 불러오지 못했어요.
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
