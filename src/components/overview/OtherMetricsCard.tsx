"use client";

import { Info } from "lucide-react";

import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { Card } from "@/components/common/Card";
import { MiniBarList, type BarItem } from "@/components/charts/MiniBarList";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const MODEL_COLOR_RULES: Array<{ match: string; color: string }> = [
  // Claude
  { match: "opus", color: "#A843B1" },
  { match: "sonnet", color: "#7BA6E0" },
  { match: "haiku", color: "#7BC67E" },
  // Gemini (구체적인 것 먼저, gemini는 catch-all)
  { match: "ultra", color: "#4A90D9" },
  { match: "flash", color: "#FBBC04" },
  { match: "pro", color: "#34A853" },
  { match: "nano", color: "#EA4335" },
  { match: "gemini", color: "#4285F4" },
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
    <Card className={`flex min-h-120 flex-col gap-5 overflow-hidden ${className ?? ""}`}>
      <h3 className="text-base font-semibold">기타 데이터</h3>

      <section>
        <h4 className="mb-2 text-sm font-medium">모델 사용량</h4>
        <MiniBarList
          items={modelBars}
          formatValue={formatTokens}
          renderValue={(item) => {
            if (item.label.toLowerCase() === "cursor") {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3 cursor-default" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                  <p>Cursor는 로컬에서 토큰 정보를 제공하지 않습니다.</p>
                  <p>
                    <a href="https://cursor.com/dashboard/usage" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                      Cursor 웹사이트 
                    </a>
                    또는 데스크탑 앱에서 확인하세요.
                  </p>
                </TooltipContent>
                </Tooltip>
              );
            }
            return formatTokens(item.value);
          }}
          emptyText="기록 없음"
        />
      </section>

      <section className="flex min-h-60 flex-1 flex-col">
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

            <ul className="custom-scrollbar mt-3 min-h-0 max-h-80 flex-1 space-y-1.5 overflow-y-auto pr-1">
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
