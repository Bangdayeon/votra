import { AlertCircle, Loader2 } from "lucide-react";

import type {
  ClaudeFileEvaluation,
  ClaudeFileSeverity,
} from "@/domain/claudeFiles/types";

const ICON: Record<ClaudeFileSeverity, string> = {
  OK: "✅",
  WARNING: "⚠️",
  DANGER: "🔴",
};

const ARIA: Record<ClaudeFileSeverity, string> = {
  OK: "정책 통과",
  WARNING: "부분 충족",
  DANGER: "정책 미달",
};

export function ClaudeFileSeverityBadge({
  evaluation,
}: {
  evaluation: ClaudeFileEvaluation;
}) {
  switch (evaluation.status) {
    case "PENDING":
    case "LOADING":
      return (
        <span
          className="ml-auto inline-flex items-center gap-1 text-[11px] leading-none text-muted-foreground"
          title="평가 중"
        >
          <Loader2 className="size-3 animate-spin" />
        </span>
      );
    case "ERROR":
      return (
        <span
          className="ml-auto inline-flex items-center gap-1 text-[11px] leading-none text-rose-600"
          title={evaluation.errorMessage}
        >
          <AlertCircle className="size-3" />
        </span>
      );
    case "DONE":
      return (
        <span
          aria-label={ARIA[evaluation.severity]}
          title={ARIA[evaluation.severity]}
          className="ml-auto text-[12px] leading-none"
        >
          {ICON[evaluation.severity]}
        </span>
      );
  }
}
