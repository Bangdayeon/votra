"use client";

import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  /** ISO 문자열, epoch ms 숫자, 또는 null. 마지막 업데이트 시각 표시용. */
  refreshedAt: number | string | null | undefined;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** 평상시 버튼 라벨. 기본값 "업데이트". */
  refreshLabel?: string;
  /** refreshing 상태에서의 버튼 라벨. 기본값 "갱신 중…". */
  refreshingLabel?: string;
};

export function CardRefreshHeader({
  title,
  refreshedAt,
  loading,
  refreshing,
  onRefresh,
  refreshLabel = "업데이트",
  refreshingLabel = "갱신 중…",
}: Props) {
  const busy = Boolean(loading || refreshing);
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
      <div className="flex w-full items-center justify-between gap-3 mb-1 lg:w-auto lg:justify-start">
        <h3 className="text-base font-semibold">{title}</h3>
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
            {refreshing ? refreshingLabel : refreshLabel}
          </span>
        </Button>
      </div>
      <p className="self-end text-xs text-muted-foreground lg:self-auto">
        마지막 업데이트: {formatRefreshedAt(refreshedAt)}
      </p>
    </div>
  );
}

function formatRefreshedAt(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "없음";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "없음";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
