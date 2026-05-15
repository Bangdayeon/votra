"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getProjectMetricsAction } from "@/app/actions/getProjectMetrics";
import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { Card } from "@/components/common/Card";
import { ClaudeFilesCard } from "@/components/claude-files/ClaudeFilesCard";
import { OtherMetricsCard } from "@/components/overview/OtherMetricsCard";
import { ProjectHeaderCard } from "@/components/project/ProjectHeaderCard";
import type { Project } from "@/components/project/ProjectsContext";
import { RetryCostCard } from "@/components/overview/RetryCostCard";
import { SessionTokensCard } from "@/components/overview/SessionTokensCard";

export function OverviewTab({ selected }: { selected: Project }) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <ProjectHeaderCard selected={selected} />

      <div className="flex min-h-0 flex-1 gap-6">
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
            <section className="flex flex-1 flex-col gap-6 min-h-0">
              <OtherMetricsCard metrics={metrics} className="flex-1" />
              <RetryCostCard retryCount={0} retryTokens={0} />
            </section>
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
