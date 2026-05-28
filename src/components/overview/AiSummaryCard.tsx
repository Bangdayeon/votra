"use client";

import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { InlineMarkdown } from "@/components/common/InlineMarkdown";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  summary?: string;
  refreshedAt?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function AiSummaryCard({
  summary,
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
        title="💡 최근 상태 및 작업 요약"
        refreshedAt={refreshedAt}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <section className="mt-4">
        {loading ? (
          <div className="flex flex-col gap-3 pl-4">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
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

    </Card>
  );
}
