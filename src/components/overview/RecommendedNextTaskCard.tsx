"use client";

import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { AgentCommandBox } from "@/components/common/AgentCommandBox";
import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { cn } from "@/lib/utils";

type Props = {
  tasks?: NextTask[];
  refreshedAt?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

const PRIORITY_LABEL: Record<NextTask["priority"], string> = {
  high: "P1",
  medium: "P2",
  low: "P3",
};

const PRIORITY_CLASS: Record<NextTask["priority"], string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
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
        title="💬 추천 다음 작업"
        refreshedAt={refreshedAt}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <section className="mt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
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
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
          PRIORITY_CLASS[task.priority],
        )}
      >
        {PRIORITY_LABEL[task.priority]}
      </span>
      <span className="text-sm font-medium text-foreground">{task.title}</span>
      {task.reason && (
        <p className="text-xs text-muted-foreground leading-snug">{task.reason}</p>
      )}
      {task.agentCommand && <AgentCommandBox command={task.agentCommand} className="w-full" />}
    </li>
  );
}
