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
      />

      <section className="mt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 분석된 내용이 없어요. 업데이트 버튼을 눌러 시작해 주세요.
          </p>
        ) : (
          <ul className="flex list-disc flex-col gap-1.5 pl-4">
            {tasks.map((task, i) => (
              <li key={i} className="text-sm text-foreground">
                <InlineMarkdown text={task} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
