"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getProjectAiSummaryAction } from "@/app/actions/getProjectAiSummary";
import { getProjectMetricsAction } from "@/app/actions/getProjectMetrics";
import type { ProjectAiSummary } from "@/application/getProjectAiSummary";
import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { Card } from "@/components/common/Card";
import { ClaudeFilesCard } from "@/components/claude-files/ClaudeFilesCard";
import { AiSummaryCard } from "@/components/overview/AiSummaryCard";
import { OtherMetricsCard } from "@/components/overview/OtherMetricsCard";
import { ProjectHeaderCard } from "@/components/project/ProjectHeaderCard";
import type { Project } from "@/components/project/ProjectsContext";
import { SessionTokensCard } from "@/components/overview/SessionTokensCard";

export function OverviewTab({ selected }: { selected: Project }) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<ProjectAiSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
    setAiError(null);
    setAiSummary(null);
    getProjectAiSummaryAction(selected.id)
      .then((s) => {
        if (!cancelled) setAiSummary(s);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAiError(err instanceof Error ? err.message : "AI 요약을 불러오지 못했어요.");
        }
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <ProjectHeaderCard selected={selected} />
      <AiSummaryCard
        summary={aiSummary?.summary}
        solution={aiSummary?.solution}
        loading={aiLoading}
        error={aiError}
      />

      <div className="flex min-h-0 flex-1 gap-6">
        <ClaudeFilesCard selected={selected} />

        {metricsLoading && (
          <section className="flex min-h-0 flex-1 flex-col gap-6">
            <Card className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </Card>
            <Card className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </Card>
          </section>
        )}

        {!metricsLoading && metrics && (
          <section className="flex min-h-0 flex-1 flex-col gap-6">
            <SessionTokensCard metrics={metrics} className="flex-1" />
            <OtherMetricsCard metrics={metrics} className="flex-1" />
          </section>
        )}

        {!metricsLoading && !metrics && (
          <section className="flex min-h-0 flex-1 flex-col gap-6">
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
          </section>
        )}
      </div>
    </div>
  );
}
