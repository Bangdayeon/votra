"use client";

import type { ProjectAiInsightRow } from "@/application/ports/projectAiSummaryRepository";
import { AgentCommandBox } from "@/components/common/AgentCommandBox";
import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { InlineMarkdown } from "@/components/common/InlineMarkdown";

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
  const summaryLines = summary ? summary.split("\n").filter(Boolean) : [];

  return (
    <Card className={`w-full ${className ?? ""}`}>
      <CardRefreshHeader
        title="💡 AI 요약 & 솔루션"
        refreshedAt={refreshedAt}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <section className="mt-4">
        <h4 className="mb-2 flex items-center gap-1.5 font-semibold">
          <span>👍</span>
          <span>프로젝트 상태 요약</span>
        </h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : summaryLines.length > 0 ? (
          <ul className="flex list-disc flex-col gap-3 pl-4">
            {summaryLines.map((line, i) => (
              <li key={i} className="min-w-0 break-words text-sm leading-relaxed text-foreground">
                <InlineMarkdown text={line} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 분석된 내용이 없어요. 새로고침 버튼을 눌러 시작해 주세요.
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
  return (
    <li className="flex flex-col gap-2">
      {insight.message && (
        <ul className="list-disc pl-4">
          <li className="text-sm leading-relaxed text-foreground">
            <InlineMarkdown text={insight.message} />
          </li>
        </ul>
      )}
      {insight.agentCommand && (
        <div className="ml-4">
          <AgentCommandBox command={insight.agentCommand} />
        </div>
      )}
    </li>
  );
}
