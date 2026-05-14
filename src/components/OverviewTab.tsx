"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getProjectMetricsAction } from "@/app/actions/getProjectMetrics";
import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { Card } from "@/components/Card";
import { FolderTree, type FolderNode } from "@/components/FolderTree";
import { OtherMetricsCard } from "@/components/OtherMetricsCard";
import type { Project } from "@/components/ProjectsContext";
import { RetryCostCard } from "@/components/RetryCostCard";
import { SessionTokensCard } from "@/components/SessionTokensCard";

const ALWAYS_OPEN_NAMES = new Set(["src"]);

/**
 * 최상위 폴더는 첫 진입 시 무조건 펼침. 자식 트리 중 이름이 "src" 인 폴더는
 * 어디든 자동으로 펼친 상태로 두고, 나머지 폴더는 닫힌 채 시작해요.
 */
function markDefaultOpen(nodes: FolderNode[], depth = 0): FolderNode[] {
  return nodes.map((n) => {
    const isRoot = depth === 0;
    const shouldOpen = isRoot ? true : ALWAYS_OPEN_NAMES.has(n.name);
    return {
      ...n,
      defaultOpen: shouldOpen,
      children: n.children ? markDefaultOpen(n.children, depth + 1) : n.children,
    };
  });
}

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
    <div className="flex h-full gap-6">
      <Card className="flex flex-1 flex-col overflow-y-auto">
        <h3 className="text-base font-semibold">아키텍처</h3>
        {selected.structure && selected.structure.length > 0 ? (
          <div className="mt-3">
            <FolderTree tree={markDefaultOpen(selected.structure)} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            폴더 구조 정보가 아직 없어요.
          </p>
        )}
      </Card>

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
  );
}
