"use client";

import { Card } from "@/components/Card";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

type Props = {
  retryCount: number;
  retryTokens: number;
  className?: string;
};

export function RetryCostCard({ retryCount, retryTokens, className }: Props) {
  return (
    <Card className={`flex flex-col gap-4 ${className ?? ""}`}>
      <h3 className="text-base font-semibold">재시도 비용</h3>

      <div className="flex gap-8">
        <div>
          <p className="text-xs text-muted-foreground">재시도 횟수</p>
          <p className="mt-1 text-2xl font-semibold">
            {retryCount.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-muted-foreground">회</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">사용된 토큰</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatTokens(retryTokens)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              토큰
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
}
