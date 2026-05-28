"use client";

import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  title: string;
  /** ISO 문자열, epoch ms 숫자, 또는 null. 마지막 업데이트 시각 표시용. */
  refreshedAt: number | string | null | undefined;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function CardRefreshHeader({
  title,
  refreshedAt,
  loading,
  refreshing,
  onRefresh,
}: Props) {
  const busy = Boolean(loading || refreshing);
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-1">
      <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-start">
        <h3 className="text-xl font-semibold">{title}</h3>
        {onRefresh && (
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={busy}
            onClick={onRefresh}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        )}
      </div>
      {loading ? (
        <Skeleton className="self-end h-3 w-28 lg:self-auto" />
      ) : (
        <p className="self-end text-xs text-muted-foreground lg:self-auto">
          마지막 업데이트: {formatRefreshedAt(refreshedAt)}
        </p>
      )}
    </div>
  );
}

function formatRefreshedAt(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "없음";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "없음";
  const now = new Date();
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowDay.getTime() - dDay.getTime()) / (1000 * 60 * 60 * 24));
  const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diffDays === 0) return `오늘 ${time}`;
  if (diffDays === 1) return `어제 ${time}`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
