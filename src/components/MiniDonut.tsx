"use client";

import type { ReactNode } from "react";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  title: string;
  segments: DonutSegment[];
  /** 도넛 중앙에 들어갈 큰 값 */
  centerValue: string;
  /** 중앙 값 아래 작은 라벨 (예: "총 토큰") */
  centerLabel?: string;
  /** 도넛 아래 상세 텍스트 */
  footer?: ReactNode;
  /** 데이터 없을 때 보일 문구 */
  emptyText?: string;
  size?: number;
  thickness?: number;
};

export function MiniDonut({
  title,
  segments,
  centerValue,
  centerLabel,
  footer,
  emptyText,
  size = 96,
  thickness = 14,
}: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const hasData = total > 0;
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size}>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#EEEEEE"
              strokeWidth={thickness}
            />
            {hasData &&
              segments.map((seg) => {
                const portion = seg.value / total;
                const dash = portion * circumference;
                const node = (
                  <circle
                    key={seg.label}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                  />
                );
                offset += dash;
                return node;
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-semibold leading-tight">{centerValue}</span>
            {centerLabel && (
              <span className="text-[10px] text-muted-foreground leading-tight">
                {centerLabel}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        {!hasData && emptyText && <p>{emptyText}</p>}
        {hasData && footer}
      </div>
    </div>
  );
}
