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

  const total = items.reduce((s, it) => s + it.value, 0);
  const format = (v: number) =>
    formatValue ? formatValue(v) : v.toLocaleString();

  return (
    <>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#EEEEEE]">
        {items.map((it) => {
          const pct = total > 0 ? (it.value / total) * 100 : 0;
          return (
            <div
              key={it.label}
              style={{ width: `${pct}%`, backgroundColor: it.color }}
              title={`${it.label} · ${format(it.value)}`}
            />
          );
        })}
      </div>

      <ul className="mt-3 space-y-1.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: it.color }}
            />
            <span className="truncate text-foreground" title={it.label}>
              {it.label}
            </span>
            <span className="ml-auto shrink-0 text-muted-foreground">
              {format(it.value)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
