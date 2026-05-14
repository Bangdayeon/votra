"use client";

export type BarItem = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  items: BarItem[];
  formatValue?: (v: number) => string;
  emptyText?: string;
};

export function MiniBarList({ items, formatValue, emptyText }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{emptyText ?? "기록 없음"}</p>
    );
  }

  const max = items.reduce((m, it) => Math.max(m, it.value), 0);

  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const pct = max > 0 ? (it.value / max) * 100 : 0;
        return (
          <li key={it.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-foreground">{it.label}</span>
              <span className="ml-2 shrink-0 text-muted-foreground">
                {formatValue ? formatValue(it.value) : it.value.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEEEEE]">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: it.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
