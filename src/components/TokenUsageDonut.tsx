"use client";

import type { ProjectMetrics } from "@/application/getProjectMetrics";
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

/** 자주 등장하는 tool 별 색상. 매칭 안 되면 ERROR_PALETTE 로 순환. */
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
const ERROR_PALETTE = ["#B07BE0", "#7BC67E", "#E0635F", "#7BE0D4", "#E07BB6", "#7BA6E0"];

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
  // 4. 에러 유형 분포 (tool 이름 기준)
  const errorSegs: DonutSegment[] = metrics.byErrorType.map((e, i) => ({
    label: e.errorType,
    value: e.count,
    color: errorColor(e.errorType, i),
  }));
  const totalErrors = errorSegs.reduce((s, x) => s + x.value, 0);
  const topError = metrics.byErrorType[0];

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
        title="에러 유형 분포"
        segments={errorSegs}
        centerValue={String(totalErrors)}
        centerLabel="총 에러"
        emptyText="에러 기록 없음"
        footer={
          <>
            {topError && (
              <p className="truncate">
                최다 · {topError.errorType} ({topError.count}회)
              </p>
            )}
            <ul className="space-y-0.5">
              {metrics.byErrorType.slice(0, 4).map((e, i) => (
                <li key={e.errorType} className="flex items-center gap-1.5 truncate">
                  <span
                    className="inline-block size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: errorColor(e.errorType, i) }}
                  />
                  <span className="truncate">{e.errorType}</span>
                  <span className="ml-auto shrink-0">{e.count}회</span>
                </li>
              ))}
            </ul>
          </>
        }
      />
    </div>
  );
}
