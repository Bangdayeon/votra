"use client";

import { Card } from "@/components/common/Card";

type Props = {
  summary?: string;
  solution?: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
};

export function AiSummaryCard({ summary, solution, loading, error, className }: Props) {
  return (
    <Card className={`w-full ${className ?? ""}`}>
      <h3 className="text-base font-semibold">AI 요약 & 솔루션</h3>

      {error && !loading && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}

      <section className="mt-4">
        <h4 className="mb-2 text-sm font-medium">요약</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">분석 중…</p>
        ) : summary ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">아직 분석된 내용이 없어요.</p>
        )}
      </section>

      <section className="mt-5">
        <h4 className="mb-2 text-sm font-medium">솔루션</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">분석 중…</p>
        ) : solution ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{solution}</p>
        ) : (
          <p className="text-sm text-muted-foreground">제안 가능한 솔루션이 없어요.</p>
        )}
      </section>
    </Card>
  );
}
