"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getProjectMetricsAction } from "@/app/actions/getProjectMetrics";
import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { Card } from "@/components/Card";
import { FolderTree, type FolderNode } from "@/components/FolderTree";
import type { Project } from "@/components/ProjectsContext";
import { TokenUsageDonut } from "@/components/TokenUsageDonut";

const AGENT_BADGE: Record<string, string> = {
  claude: "bg-[#E0A57B]",
  gpt: "bg-[#74AA9C]",
  gemini: "bg-[#4285F4]",
};

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

  const badgeColor = selected.agent
    ? (AGENT_BADGE[selected.agent] ?? "bg-muted-foreground")
    : null;

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card className="col-span-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{selected.name}</h2>
          {selected.agent && badgeColor && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium text-white ${badgeColor}`}
            >
              {selected.agent}
            </span>
          )}
        </div>
        {selected.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {selected.description}
          </p>
        )}
      </Card>

      <Card className="row-span-2 min-h-[480px]">
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

      <Card>
        <h3 className="text-base font-semibold">토큰 사용량</h3>
        {metricsLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : metrics ? (
          <TokenUsageDonut metrics={metrics} />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            데이터를 불러오지 못했어요.
          </p>
        )}
      </Card>

      <Card>
        <p className="text-sm text-foreground">
          또 뭘 보여주지.. 없으면 없애도 됨.. 세션 개수? 가이드 문서?
        </p>
      </Card>
    </div>
  );
}
