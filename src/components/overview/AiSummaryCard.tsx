"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

import type { ProjectAiInsightRow } from "@/application/ports/projectAiSummaryRepository";
import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { Button } from "@/components/ui/button";

function InlineMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      parts.push(<strong key={key++}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      parts.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]">
          {m[3]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

type Props = {
  summary?: string;
  suggestions?: ProjectAiInsightRow[];
  refreshedAt?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function AiSummaryCard({
  summary,
  suggestions = [],
  refreshedAt,
  loading,
  refreshing,
  onRefresh,
  className,
}: Props) {
  const hasContent = Boolean(summary) || suggestions.length > 0;
  const summaryLines = summary ? summary.split("\n").filter(Boolean) : [];

  return (
    <Card className={`w-full ${className ?? ""}`}>
      <CardRefreshHeader
        title="AI 요약 & 솔루션"
        refreshedAt={refreshedAt}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        refreshLabel={hasContent ? "업데이트" : "분석 시작"}
        refreshingLabel="분석 중…"
      />

      <section className="mt-4">
        <h4 className="mb-2 flex items-center gap-1.5 font-semibold">
          <span>👍</span>
          <span>프로젝트 상태 요약</span>
        </h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : summaryLines.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-4">
            {summaryLines.map((line, i) => (
              <li key={i} className="text-sm text-foreground">
                <InlineMarkdown text={line} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 분석된 내용이 없어요. 업데이트 버튼을 눌러 시작해 주세요.
          </p>
        )}
      </section>

      <section className="mt-5">
        <h4 className="mb-2 flex items-center gap-1.5 font-semibold">
          <span>💬</span>
          <span>제안</span>
        </h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 제안이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {suggestions.map((s, i) => (
              <SuggestionItem key={`s-${i}`} insight={s} />
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}

function SuggestionItem({ insight }: { insight: ProjectAiInsightRow }) {
  const [copied, setCopied] = useState(false);

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
    <li className="flex flex-col gap-2">
      {insight.message && (
        <ul className="list-disc pl-4">
          <li className="text-sm text-foreground">
            <InlineMarkdown text={insight.message} />
          </li>
        </ul>
      )}
      {insight.agentCommand && (
        <div className="ml-4 rounded-md border border-[#E4E2DD] bg-[#FAFAF8] p-3">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
            {insight.agentCommand}
          </pre>
          <div className="mt-2 flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={onCopy}>
              {copied ? (
                <Check className="size-3.5 text-green-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
              <span className={`ml-1.5 text-xs ${copied ? "text-green-600" : ""}`}>
                {copied ? "복사됨" : "복사"}
              </span>
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
