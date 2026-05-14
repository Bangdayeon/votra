"use client";

import { useEffect, useRef, useState } from "react";

import type {
  ProjectMetrics,
  SessionTokenRow,
} from "@/application/getProjectMetrics";
import { Card } from "@/components/Card";
import { MiniDonut, type DonutSegment } from "@/components/MiniDonut";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SESSION_PALETTE = [
  "#A843B1",
  "#7BA6E0",
  "#7BC67E",
  "#E0A57B",
  "#B07BE0",
  "#E07BB6",
  "#7BE0D4",
];

const FALLBACK_COLOR = "#9CA3AF";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** donut 가독성 위해 6 개 초과 시 top 5 + 기타 로 압축. 리스트는 압축 안 함 */
function compactSegments(segs: DonutSegment[], topN = 5): DonutSegment[] {
  if (segs.length <= topN) return segs;
  const top = segs.slice(0, topN);
  const restTotal = segs.slice(topN).reduce((s, x) => s + x.value, 0);
  return [...top, { label: "기타", value: restTotal, color: FALLBACK_COLOR }];
}

type Props = {
  metrics: ProjectMetrics;
  className?: string;
};

export function SessionTokensCard({ metrics, className }: Props) {
  const sortedSessions = [...metrics.sessions]
    .filter((s) => s.totalTokens > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const donutSegments = compactSegments(
    sortedSessions.map((s, i) => ({
      label: s.title,
      value: s.totalTokens,
      color: SESSION_PALETTE[i % SESSION_PALETTE.length],
    })),
  );

  return (
    <Card className={`flex min-h-0 flex-col overflow-hidden ${className ?? ""}`}>
      <h3 className="text-base font-semibold">세션별 토큰 사용량</h3>

      <div className="mt-4 flex justify-center">
        <MiniDonut
          segments={donutSegments}
          centerValue={formatTokens(metrics.totals.totalTokens)}
          centerLabel="총 토큰"
          emptyText="기록 없음"
          size={140}
          thickness={20}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        세션 {sortedSessions.length} 개
      </p>

      <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {sortedSessions.map((s, i) => (
          <SessionListItem
            key={s.id}
            session={s}
            color={SESSION_PALETTE[i % SESSION_PALETTE.length]}
          />
        ))}
      </ul>
    </Card>
  );
}

function SessionListItem({
  session,
  color,
}: {
  session: SessionTokenRow;
  color: string;
}) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [session.title]);

  const row = (
    <li className="flex cursor-default items-center gap-2 text-xs">
      <span
        className="inline-block size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span ref={titleRef} className="truncate text-foreground">
        {session.title}
      </span>
      <span className="ml-auto shrink-0 text-muted-foreground">
        {formatTokens(session.totalTokens)}
      </span>
    </li>
  );

  if (!isTruncated) return row;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="bottom">{session.title}</TooltipContent>
    </Tooltip>
  );
}
