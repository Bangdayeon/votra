"use client";

import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { InlineMarkdown } from "@/components/common/InlineMarkdown";

type Props = {
  tasks?: string[];
  refreshedAt?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function RecommendedNextTaskCard({
  tasks = [],
  refreshedAt,
  loading,
  refreshing,
  onRefresh,
  className,
}: Props) {
  const hasContent = tasks.length > 0;

  return (
    <Card className={`w-full ${className ?? ""}`}>
      <CardRefreshHeader
        title="💬 추천 다음 작업"
        refreshedAt={refreshedAt}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        refreshLabel={hasContent ? "업데이트" : "분석 시작"}
        refreshingLabel="분석 중…"
      />

      <section className="mt-4">
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        </h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 분석된 내용이 없어요. 업데이트 버튼을 눌러 시작해 주세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {tasks.map((task, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="mt-0.5 shrink-0 text-muted-foreground">-</span>
                <span>{task}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
