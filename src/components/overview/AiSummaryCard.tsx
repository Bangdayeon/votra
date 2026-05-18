"use client";

import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

import type { ProjectAiInsightRow } from "@/application/ports/projectAiSummaryRepository";
import { Card } from "@/components/common/Card";
import { Button } from "@/components/ui/button";

type Props = {
  summary?: string;
  warnings?: ProjectAiInsightRow[];
  suggestions?: ProjectAiInsightRow[];
  refreshedAt?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function AiSummaryCard({
  summary,
  warnings = [],
  suggestions = [],
  refreshedAt,
  loading,
  refreshing,
  onRefresh,
  className,
}: Props) {
  const hasContent = Boolean(summary) || warnings.length > 0 || suggestions.length > 0;
  const busy = loading || refreshing;

  return (
    <Card className={`w-full ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold">AI 요약 & 솔루션</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onRefresh}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            <span className="ml-2">
              {refreshing ? "분석 중…" : hasContent ? "업데이트" : "분석 시작"}
            </span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          마지막 업데이트: {formatRefreshedAt(refreshedAt)}
        </p>
      </div>

      <section className="mt-2">
        <h4 className="mb-2 text-sm font-medium">요약</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : summary ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 분석된 내용이 없어요. 업데이트 버튼을 눌러 시작해 주세요.
          </p>
        )}
      </section>

      <section className="mt-5">
        <h4 className="mb-2 text-sm font-medium">주의사항</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 주의사항이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {warnings.map((w, i) => (
              <InsightItem key={`w-${i}`} insight={w} tone="warning" />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <h4 className="mb-2 text-sm font-medium">제안</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 제안이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {suggestions.map((s, i) => (
              <InsightItem key={`s-${i}`} insight={s} tone="suggestion" />
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}

function InsightItem({
  insight,
  tone,
}: {
  insight: ProjectAiInsightRow;
  tone: "warning" | "suggestion";
}) {
  const [copied, setCopied] = useState(false);
  const borderClass =
    tone === "warning"
      ? "border-l-2 border-l-amber-500"
      : "border-l-2 border-l-emerald-500";

  const onCopy = async () => {
    if (!insight.agentCommand) return;
    try {
      await navigator.clipboard.writeText(insight.agentCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 무시
    }
  };

  return (
    <li className={`rounded-md bg-[#FAFAF8] p-3 pl-4 ${borderClass}`}>
      {insight.message && (
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {insight.message}
        </p>
      )}
      {insight.agentCommand && (
        <div className="mt-2 rounded-md bg-background p-2">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
            {insight.agentCommand}
          </pre>
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCopy}
            >
              <Copy className="size-3.5" />
              <span className="ml-1.5 text-xs">
                {copied ? "복사됨" : "복사"}
              </span>
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function formatRefreshedAt(iso?: string | null): string {
  if (!iso) return "없음";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "없음";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
