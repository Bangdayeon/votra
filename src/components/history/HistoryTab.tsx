"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getProjectMetricsAction } from "@/app/actions/getProjectMetrics";
import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { BranchTab } from "@/components/branch/BranchTab";
import { Card } from "@/components/common/Card";
import { OtherMetricsCard } from "@/components/overview/OtherMetricsCard";
import { SessionTokensCard } from "@/components/overview/SessionTokensCard";
import type { Project } from "@/components/project/ProjectsContext";
import { useProjectEvents } from "@/hooks/useProjectEvents";

export function HistoryTab({ selected }: { selected: Project }) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const branchTabRef = useRef<HTMLDivElement>(null);

  const handleSessionSelect = useCallback((id: string) => {
    setSelectedSessionId(id);
    branchTabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMetricsLoading(true);
    getProjectMetricsAction(selected.id)
      .then((m) => { if (!cancelled) setMetrics(m); })
      .catch(() => { if (!cancelled) setMetrics(null); })
      .finally(() => { if (!cancelled) setMetricsLoading(false); });
    return () => { cancelled = true; };
  }, [selected.id]);

  useProjectEvents(
    selected.id,
    useCallback(() => {
      getProjectMetricsAction(selected.id)
        .then((m) => setMetrics(m))
        .catch(() => {});
    }, [selected.id]),
  );

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-col lg:flex-row flex-1 gap-6">
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
            <SessionTokensCard metrics={metrics} className="flex-1" onSelect={handleSessionSelect} selectedId={selectedSessionId} />
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

      <div ref={branchTabRef}>
        <BranchTab selected={selected} selectedSessionId={selectedSessionId} />
      </div>
    </div>
  );
}
