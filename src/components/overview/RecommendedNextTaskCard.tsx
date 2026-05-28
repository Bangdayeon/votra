"use client";

import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { AgentCommandBox } from "@/components/common/AgentCommandBox";
import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  tasks?: NextTask[];
  refreshedAt?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function RecommendedNextTaskCard({
  tasks = [],
  refreshedAt,
  loading,
  refreshing,
  onRefresh,
  className,
}: Props) {
  return (
    <Card className={`w-full ${className ?? ""}`}>
      <CardRefreshHeader
        title="💬 제안 작업"
        refreshedAt={refreshedAt}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <section className="mt-4">
        {loading ? (
          <ul className="flex flex-col gap-4">
            {[0, 1].map((i) => (
              <li key={i} className="flex flex-col items-start gap-1.5">
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-7 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-3 w-2/3" />
              </li>
            ))}
          </ul>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 분석된 내용이 없어요. 새로고침 버튼을 눌러 시작해 주세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {tasks.map((task, i) => (
              <NextTaskItem key={i} task={task} />
            ))}
          </ul>
        )}
      </section>
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
