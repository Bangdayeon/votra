"use client";

import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";

import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
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
  high: "높음",
  medium: "보통",
  low: "낮음",
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
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(task.agentCommand);
      toast.success("명령어를 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요.");
    }
  };

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            PRIORITY_CLASS[task.priority],
          )}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
        <span className="text-sm font-medium text-foreground">{task.title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{task.reason}</p>
      <div className="flex items-start gap-2 rounded border border-border bg-muted/40 px-2 py-1.5 font-mono text-[11px] leading-snug">
        <p className="flex-1 whitespace-pre-wrap break-words text-foreground">
          {task.agentCommand}
        </p>
        <button
          type="button"
          onClick={onCopy}
          aria-label="명령어 복사"
          title="복사"
          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ClipboardCopy className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
