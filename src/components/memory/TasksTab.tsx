"use client";

import { CheckSquare, Circle, Clock, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getProjectTasksAction, type TaskRecord, type TaskStatusValue } from "@/app/actions/getProjectTasks";
import { updateTaskStatusAction } from "@/app/actions/updateTaskStatus";
import type { Project } from "@/components/project/ProjectsContext";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<TaskStatusValue, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
  CANCELLED: "취소됨",
};

const STATUS_COLORS: Record<TaskStatusValue, string> = {
  PENDING: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const FILTERS: { label: string; value: TaskStatusValue | "ALL" }[] = [
  { label: "전체", value: "ALL" },
  { label: "대기", value: "PENDING" },
  { label: "진행 중", value: "IN_PROGRESS" },
  { label: "완료", value: "DONE" },
];

function StatusIcon({ status }: { status: TaskStatusValue }) {
  if (status === "DONE") return <CheckSquare className="size-4 text-green-600 shrink-0" />;
  if (status === "IN_PROGRESS") return <Clock className="size-4 text-blue-600 shrink-0" />;
  if (status === "CANCELLED") return <XCircle className="size-4 text-red-500 shrink-0" />;
  return <Circle className="size-4 text-muted-foreground shrink-0" />;
}

function TaskRow({
  task,
  projectId,
  onUpdated,
}: {
  task: TaskRecord;
  projectId: string;
  onUpdated: (updated: TaskRecord) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function cycleStatus() {
    const next: TaskStatusValue =
      task.status === "PENDING"
        ? "IN_PROGRESS"
        : task.status === "IN_PROGRESS"
          ? "DONE"
          : "PENDING";
    setLoading(true);
    try {
      const updated = await updateTaskStatusAction(projectId, task.seq, next);
      onUpdated(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "상태 변경에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <button
        onClick={cycleStatus}
        disabled={loading || task.status === "CANCELLED"}
        className="mt-0.5 rounded transition-opacity hover:opacity-70 disabled:opacity-40"
        aria-label="상태 변경"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
        ) : (
          <StatusIcon status={task.status} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", task.status === "DONE" && "line-through text-muted-foreground")}>
          #{task.seq} {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[task.status])}>
            {STATUS_LABELS[task.status]}
          </span>
          {task.module && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {task.module}
            </span>
          )}
          {task.priority > 0 && (
            <span className="text-xs text-muted-foreground">P{task.priority}</span>
          )}
        </div>
      </div>
    </li>
  );
}

export function TasksTab({ selected }: { selected: Project }) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskStatusValue | "ALL">("ALL");

  const loadTasks = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    getProjectTasksAction(selected.id)
      .then((t) => { if (!cancelled) setTasks(t); })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "태스크를 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected.id]);

  useEffect(() => { return loadTasks(); }, [loadTasks]);

  function handleUpdated(updated: TaskRecord) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  const filtered = filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">태스크</h2>
            {!loading && (
              <p className="text-xs text-muted-foreground">{tasks.length}개</p>
            )}
          </div>
          <div className="flex gap-1">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
            <CheckSquare className="size-8 opacity-40" strokeWidth={1.5} />
            <p>{filter === "ALL" ? "AI가 등록한 태스크가 없어요." : "해당 상태의 태스크가 없어요."}</p>
            <p className="text-xs">AI 도구에서 <code className="rounded bg-muted px-1 py-0.5">add_task</code> 툴로 등록하세요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectId={selected.id}
                onUpdated={handleUpdated}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
