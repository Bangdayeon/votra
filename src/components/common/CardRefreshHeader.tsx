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
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const time = d.toLocaleString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${yy}.${mm}.${dd}, ${time}`;
}
