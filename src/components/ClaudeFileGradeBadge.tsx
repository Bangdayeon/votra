import { cn } from "@/lib/utils";
import type { ClaudeFileGrade } from "@/domain/claudeFiles/types";

const GRADE_CLASS: Record<ClaudeFileGrade, string> = {
  A: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  B: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  C: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  D: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  F: "bg-rose-500/10 text-rose-600 border-rose-500/30",
};

export function ClaudeFileGradeBadge({
  grade,
  total,
}: {
  grade: ClaudeFileGrade;
  total: number;
}) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        GRADE_CLASS[grade],
      )}
    >
      <span>{grade}</span>
      <span className="opacity-70">{total}</span>
    </span>
  );
}
