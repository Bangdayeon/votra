"use client";

import type { ProjectMetrics, SessionTokenRow } from "@/application/getProjectMetrics";
import { MiniDonut, type DonutSegment } from "@/components/MiniDonut";

const SESSION_PALETTE = [
  "#A843B1",
  "#7BA6E0",
  "#7BC67E",
  "#E0A57B",
  "#B07BE0",
  "#E07BB6",
  "#7BE0D4",
];

const MODEL_COLOR_RULES: Array<{ match: string; color: string }> = [
  { match: "opus", color: "#A843B1" },
  { match: "sonnet", color: "#7BA6E0" },
  { match: "haiku", color: "#7BC67E" },
];

const FALLBACK_COLOR = "#9CA3AF";

/** USD per million tokens (대략적인 Claude 가격, 2026-01 기준) */
const MODEL_PRICES: Array<{ match: string; input: number; output: number }> = [
  { match: "opus", input: 15, output: 75 },
  { match: "sonnet", input: 3, output: 15 },
  { match: "haiku", input: 0.8, output: 4 },
];

function modelColor(model: string): string {
  const lower = model.toLowerCase();
  for (const rule of MODEL_COLOR_RULES) {
    if (lower.includes(rule.match)) return rule.color;
  }
  return FALLBACK_COLOR;
}

function priceFor(model: string): { input: number; output: number } | null {
  const lower = model.toLowerCase();
  for (const rule of MODEL_PRICES) {
    if (lower.includes(rule.match)) return { input: rule.input, output: rule.output };
  }
  return null;
}

function sessionCostUsd(s: SessionTokenRow): number {
  const price = priceFor(s.model);
  if (!price) return 0;
  return (s.inputTokens * price.input + s.outputTokens * price.output) / 1_000_000;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return "<$0.01";
  if (usd < 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(2)}`;
}

/** 세그먼트 N개 초과 시 top-N + "기타" 로 압축 */
function compactSegments(segs: DonutSegment[], topN = 5): DonutSegment[] {
  if (segs.length <= topN) return segs;
  const top = segs.slice(0, topN);
  const rest = segs.slice(topN);
  const restTotal = rest.reduce((s, x) => s + x.value, 0);
  return [...top, { label: "기타", value: restTotal, color: FALLBACK_COLOR }];
}

type Props = {
  metrics: ProjectMetrics;
};

export function TokenUsageDonut({ metrics }: Props) {
  // 1. 세션별 사용량 — 토큰 순 정렬해서 top 5 + 기타
  const sessionSegs = compactSegments(
    [...metrics.sessions]
      .filter((s) => s.totalTokens > 0)
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .map((s, i) => ({
        label: s.title,
        value: s.totalTokens,
        color: SESSION_PALETTE[i % SESSION_PALETTE.length],
      })),
  );
  const sessionTotal = metrics.totals.totalTokens;
  const topSession = sessionSegs[0];

  const retrySegs: DonutSegment[] = [];
  const retryTotal = 0;

  // 3. 모델 사용량
  const modelSegs: DonutSegment[] = metrics.byModel.map((m) => ({
    label: m.model,
    value: m.totalTokens,
    color: modelColor(m.model),
  }));
  const topModel = metrics.byModel[0];

  // 4. 예상 비용 (모델별 누적)
  const costByModel = new Map<string, number>();
  for (const s of metrics.sessions) {
    const c = sessionCostUsd(s);
    costByModel.set(s.model, (costByModel.get(s.model) ?? 0) + c);
  }
  const costSegs: DonutSegment[] = [...costByModel.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([model, v]) => ({
      label: model,
      value: v,
      color: modelColor(model),
    }));
  const totalCost = costSegs.reduce((s, x) => s + x.value, 0);
  const topCost = costSegs[0];

  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
      <MiniDonut
        title="세션별 사용량"
        segments={sessionSegs}
        centerValue={formatTokens(sessionTotal)}
        centerLabel="총 토큰"
        emptyText="기록 없음"
        footer={
          <>
            <p>세션 {metrics.totals.sessionCount} 개</p>
            {topSession && (
              <p className="truncate">
                최대 · {topSession.label} ({formatTokens(topSession.value)})
              </p>
            )}
          </>
        }
      />

      <MiniDonut
        title="재시도 비용"
        segments={retrySegs}
        centerValue={retryTotal === 0 ? "0" : formatTokens(retryTotal)}
        centerLabel="재시도 토큰"
        emptyText="재시도 기록 없음"
      />

      <MiniDonut
        title="모델 사용량"
        segments={modelSegs}
        centerValue={`${metrics.byModel.length}`}
        centerLabel="모델 수"
        emptyText="기록 없음"
        footer={
          <ul className="space-y-0.5">
            {metrics.byModel.map((m) => {
              const pct = sessionTotal > 0 ? (m.totalTokens / sessionTotal) * 100 : 0;
              return (
                <li key={m.model} className="flex items-center gap-1.5 truncate">
                  <span
                    className="inline-block size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: modelColor(m.model) }}
                  />
                  <span className="truncate">{m.model}</span>
                  <span className="ml-auto shrink-0">{pct.toFixed(0)}%</span>
                </li>
              );
            })}
          </ul>
        }
      />

      <MiniDonut
        title="예상 비용"
        segments={costSegs}
        centerValue={formatCost(totalCost)}
        centerLabel="총 USD"
        emptyText="가격표에 없는 모델이에요"
        footer={
          <>
            {topCost && (
              <p className="truncate">
                최대 · {topCost.label} ({formatCost(topCost.value)})
              </p>
            )}
            <p className="text-[10px] opacity-70">대략적인 가격 기반 추정값</p>
          </>
        }
      />
    </div>
  );
}
