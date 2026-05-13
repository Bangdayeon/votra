"use client";

import type { ProjectMetrics } from "@/application/getProjectMetrics";

const PALETTE = ["#A843B1", "#7BA6E0", "#7BC67E", "#E0A57B", "#B07BE0", "#E07BB6", "#7BE0D4"];

function colorForModel(model: string, index: number): string {
  if (model.includes("opus")) return "#A843B1";
  if (model.includes("sonnet")) return "#7BA6E0";
  if (model.includes("haiku")) return "#7BC67E";
  return PALETTE[index % PALETTE.length];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

type Props = {
  metrics: ProjectMetrics;
};

export function TokenUsageDonut({ metrics }: Props) {
  const segments = metrics.byModel.map((m, i) => ({
    label: m.model,
    value: m.totalTokens,
    sessionCount: m.sessionCount,
    color: colorForModel(m.model, i),
  }));

  const total = metrics.totals.totalTokens;
  const hasData = total > 0;

  const size = 160;
  const thickness = 22;
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="mt-4 flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#EEEEEE"
            strokeWidth={thickness}
          />
          {hasData &&
            segments.map((seg) => {
              const portion = seg.value / total;
              const dashLength = portion * circumference;
              const node = (
                <circle
                  key={seg.label}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  strokeLinecap="butt"
                />
              );
              offset += dashLength;
              return node;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold">{formatTokens(total)}</span>
          <span className="text-xs text-muted-foreground">총 토큰</span>
        </div>
      </div>

      <div className="w-full space-y-1 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>세션 {metrics.totals.sessionCount} 개</span>
          <span>
            input {formatTokens(metrics.totals.inputTokens)} · output{" "}
            {formatTokens(metrics.totals.outputTokens)}
          </span>
        </div>
        <ul className="space-y-1">
          {!hasData && (
            <li className="text-muted-foreground">아직 토큰 사용 기록이 없어요.</li>
          )}
          {segments.map((seg) => {
            const pct = total > 0 ? (seg.value / total) * 100 : 0;
            return (
              <li key={seg.label} className="flex items-center gap-2">
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="flex-1 truncate font-medium">{seg.label}</span>
                <span className="text-muted-foreground">
                  {formatTokens(seg.value)} · {pct.toFixed(0)}% · {seg.sessionCount}회
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
