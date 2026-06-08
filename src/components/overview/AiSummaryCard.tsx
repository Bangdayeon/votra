"use client";

import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import type { ProjectAiInsightRow } from "@/application/ports/projectAiSummaryRepository";
import { AgentCommandBox } from "@/components/common/AgentCommandBox";
import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { InlineMarkdown } from "@/components/common/InlineMarkdown";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  summary?: string;
  warnings?: ProjectAiInsightRow[];
  nextTasks?: NextTask[];
  refreshedAt?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function AiSummaryCard({
  summary,
  warnings = [],
  nextTasks = [],
  refreshedAt,
  loading,
  refreshing,
  onRefresh,
  className,
}: Props) {
  const summaryLines = summary ? summary.split("\n").filter(Boolean) : [];

  return (
    <Card className={`w-full ${className ?? ""}`}>
      <CardRefreshHeader
        title="💡 최근 상태 및 작업 요약"
        refreshedAt={refreshedAt}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <section className="mt-4">
        {loading ? (
          <div className="flex flex-col gap-3 pl-4">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : summaryLines.length > 0 ? (
          <ul className="flex list-disc flex-col gap-3 pl-4">
            {summaryLines.map((line, i) => (
              <li key={i} className="min-w-0 break-words text-sm leading-relaxed text-foreground">
                <InlineMarkdown text={line} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 분석된 내용이 없어요. 새로고침 버튼을 눌러 시작해 주세요.
          </p>
        )}
      </section>

      {!loading && nextTasks.length > 0 && (
        <section className="mt-5 border-t pt-4">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">제안 작업</p>
          <ul className="flex flex-col gap-4">
            {nextTasks.map((task, i) => (
              <NextTaskItem key={i} task={task} />
            ))}
          </ul>
        </section>
      )}

      {!loading && warnings.length > 0 && (
        <section className="mt-5 border-t pt-4">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">주의사항</p>
          <ul className="flex flex-col gap-3">
            {warnings.map((w, i) => (
              <li key={i} className="flex flex-col gap-1">
                {w.message && (
                  <p className="text-sm text-foreground">{w.message}</p>
                )}
                {w.agentCommand && <AgentCommandBox command={w.agentCommand} className="w-full" />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}

function NextTaskItem({ task }: { task: NextTask }) {
  return (
    <li className="flex flex-col items-start gap-1.5">
      <div className="flex gap-1.5">
        <PriorityBadge priority={task.priority} />
        <span className="text-sm font-medium text-foreground">{task.title}</span>
      </div>
      {task.reason && (
        <p className="text-xs text-muted-foreground leading-snug">{task.reason}</p>
      )}
      {task.agentCommand && <AgentCommandBox command={task.agentCommand} className="w-full" />}
    </li>
  );
}
