"use client";

import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { Card } from "@/components/Card";
import { MiniBarList, type BarItem } from "@/components/MiniBarList";

const MODEL_COLOR_RULES: Array<{ match: string; color: string }> = [
  { match: "opus", color: "#A843B1" },
  { match: "sonnet", color: "#7BA6E0" },
  { match: "haiku", color: "#7BC67E" },
];

const ERROR_COLOR_RULES: Array<{ match: string; color: string }> = [
  { match: "Bash", color: "#E0A57B" },
  { match: "Edit", color: "#E0635F" },
  { match: "Write", color: "#E07BB6" },
  { match: "Read", color: "#E0B97B" },
  { match: "Grep", color: "#7BC67E" },
  { match: "Glob", color: "#7BE0D4" },
  { match: "Task", color: "#A843B1" },
  { match: "WebFetch", color: "#7BA6E0" },
];

const ERROR_PALETTE = [
  "#B07BE0",
  "#7BC67E",
  "#E0635F",
  "#7BE0D4",
  "#E07BB6",
  "#7BA6E0",
];

const FALLBACK_COLOR = "#9CA3AF";

function modelColor(model: string): string {
  const lower = model.toLowerCase();
  for (const rule of MODEL_COLOR_RULES) {
    if (lower.includes(rule.match)) return rule.color;
  }
  return FALLBACK_COLOR;
}

function errorColor(errorType: string, index: number): string {
  for (const rule of ERROR_COLOR_RULES) {
    if (errorType === rule.match) return rule.color;
  }
  return ERROR_PALETTE[index % ERROR_PALETTE.length];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

type Props = {
  metrics: ProjectMetrics;
  className?: string;
};

export function OtherMetricsCard({ metrics, className }: Props) {
  const modelBars: BarItem[] = metrics.byModel.map((m) => ({
    label: m.model,
    value: m.totalTokens,
    color: modelColor(m.model),
  }));

  const errorSegs = metrics.byErrorType.map((e, i) => ({
    label: e.errorType,
    value: e.count,
    color: errorColor(e.errorType, i),
  }));
  const errorTotal = errorSegs.reduce((s, x) => s + x.value, 0);

  return (
    <Card className={`flex min-h-0 flex-col gap-5 overflow-hidden ${className ?? ""}`}>
      <h3 className="text-base font-semibold">기타 데이터</h3>

      <section>
        <h4 className="mb-2 text-sm font-medium">모델 사용량</h4>
        <MiniBarList
          items={modelBars}
          formatValue={formatTokens}
          emptyText="기록 없음"
        />
      </section>

      <section className="flex min-h-0 flex-1 flex-col">
        <h4 className="mb-2 text-sm font-medium">에러 유형 분포</h4>

        {errorTotal === 0 ? (
          <p className="text-xs text-muted-foreground">에러 기록 없음</p>
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#EEEEEE]">
              {errorSegs.map((seg) => {
                const pct = (seg.value / errorTotal) * 100;
                return (
                  <div
                    key={seg.label}
                    style={{ width: `${pct}%`, backgroundColor: seg.color }}
                    title={`${seg.label} · ${seg.value}회`}
                  />
                );
              })}
            </div>

            <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {errorSegs.map((seg) => (
                <li key={seg.label} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate text-foreground" title={seg.label}>
                    {seg.label}
                  </span>
                  <span className="ml-auto shrink-0 text-muted-foreground">
                    {seg.value}회
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </Card>
  );
}
