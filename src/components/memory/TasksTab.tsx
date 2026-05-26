"use client";

import { CheckSquare, Circle, Clock, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getProjectTasksAction, type TaskRecord, type TaskStatusValue } from "@/app/actions/getProjectTasks";
import { updateTaskStatusAction } from "@/app/actions/updateTaskStatus";
import type { Project } from "@/components/project/ProjectsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjectEvents } from "@/hooks/useProjectEvents";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<TaskStatusValue, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
  CANCELLED: "취소됨",
};

const STATUS_STYLES: Record<TaskStatusValue, string> = {
  PENDING: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const NEXT_STATUS: Partial<Record<TaskStatusValue, TaskStatusValue>> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "PENDING",
};

const FILTERS: { label: string; value: TaskStatusValue | "ALL" }[] = [
  { label: "전체", value: "ALL" },
  { label: "진행 중", value: "IN_PROGRESS" },
  { label: "대기", value: "PENDING" },
  { label: "완료", value: "DONE" },
];

function StatusIcon({ status, className }: { status: TaskStatusValue; className?: string }) {
  if (status === "DONE") return <CheckSquare className={cn("size-4 text-green-600", className)} />;
  if (status === "IN_PROGRESS") return <Clock className={cn("size-4 text-blue-600", className)} />;
  if (status === "CANCELLED") return <XCircle className={cn("size-4 text-red-500", className)} />;
  return <Circle className={cn("size-4 text-muted-foreground", className)} />;
}

function TaskCard({
  task,
  projectId,
  onUpdated,
  onSelect,
}: {
  task: TaskRecord;
  projectId: string;
  onUpdated: (updated: TaskRecord) => void;
  onSelect: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const nextStatus = NEXT_STATUS[task.status];

  async function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!nextStatus || loading) return;
    setLoading(true);
    try {
      const updated = await updateTaskStatusAction(projectId, task.seq, nextStatus);
      onUpdated(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "상태 변경에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-sm cursor-pointer",
        task.status === "DONE" && "opacity-60",
      )}
    >
      {/* 상단: 상태 + seq */}
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[task.status])}>
          {STATUS_LABELS[task.status]}
        </span>
        <span className="text-xs text-muted-foreground">#{task.seq}</span>
      </div>

      {/* 제목 */}
      <p className={cn("text-sm font-semibold leading-snug", task.status === "DONE" && "line-through")}>
        {task.title}
      </p>

      {/* 설명 */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* 하단: 모듈 + 우선순위 + 상태 변경 버튼 */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {task.module && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {task.module}
            </span>
          )}
          {task.priority > 0 && (
            <span className="text-xs font-medium text-muted-foreground">P{task.priority}</span>
          )}
        </div>

        {nextStatus && (
          <button
            onClick={handleStatusClick}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            title={`${STATUS_LABELS[nextStatus]}으로 변경`}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <StatusIcon status={nextStatus} className="size-3.5" />
            )}
            {STATUS_LABELS[nextStatus]}
          </button>
        )}
      </div>
    </div>
  );
}

function TaskDetailModal({
  task,
  projectId,
  onUpdated,
  open,
  onOpenChange,
}: {
  task: TaskRecord | null;
  projectId: string;
  onUpdated: (updated: TaskRecord) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  const nextStatus = task ? NEXT_STATUS[task.status] : undefined;

  async function handleStatusClick() {
    if (!nextStatus || loading || !task) return;
    setLoading(true);
    try {
      const updated = await updateTaskStatusAction(projectId, task.seq, nextStatus);
      onUpdated(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "상태 변경에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {task && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[task.status])}>
                  {STATUS_LABELS[task.status]}
                </span>
                <span className="text-xs text-muted-foreground">#{task.seq}</span>
              </div>
              <DialogTitle className={cn(task.status === "DONE" && "line-through")}>
                {task.title}
              </DialogTitle>
            </DialogHeader>

            {task.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            )}

            <div className="flex flex-col gap-2 text-sm">
              {task.module && (
                <div className="flex items-center gap-3">
                  <span className="w-14 text-xs text-muted-foreground">모듈</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {task.module}
                  </span>
                </div>
              )}
              {task.priority > 0 && (
                <div className="flex items-center gap-3">
                  <span className="w-14 text-xs text-muted-foreground">우선순위</span>
                  <span className="text-xs font-medium">P{task.priority}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="w-14 text-xs text-muted-foreground">등록일</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(task.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
              {task.updatedAt.getTime() !== task.createdAt.getTime() && (
                <div className="flex items-center gap-3">
                  <span className="w-14 text-xs text-muted-foreground">수정일</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.updatedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              )}
            </div>

            {nextStatus && (
              <div className="border-t pt-3">
                <button
                  onClick={handleStatusClick}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <StatusIcon status={nextStatus} />
                  )}
                  {STATUS_LABELS[nextStatus]}으로 변경
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TasksTab({ selected }: { selected: Project }) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskStatusValue | "ALL">("ALL");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

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
  useProjectEvents(selected.id, loadTasks);

  function handleUpdated(updated: TaskRecord) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  const filtered = filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter);

  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;

  return (
    <>
    <TaskDetailModal
      task={selectedTask}
      projectId={selected.id}
      onUpdated={handleUpdated}
      open={selectedTaskId !== null}
      onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
    />
    <div className="flex flex-col gap-4">
      {/* 헤더 + 필터 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">태스크</h2>
          {!loading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {inProgressCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 font-medium">
                  진행 중 {inProgressCount}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                  대기 {pendingCount}
                </span>
              )}
            </div>
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

      {/* 카드 그리드 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <CheckSquare className="size-8 opacity-30" strokeWidth={1.5} />
          <p>{filter === "ALL" ? "AI가 등록한 태스크가 없어요." : "해당 상태의 태스크가 없어요."}</p>
          <p className="text-xs">
            AI 도구에서 <code className="rounded bg-muted px-1 py-0.5">add_task</code> 또는{" "}
            <code className="rounded bg-muted px-1 py-0.5">brief</code> 툴로 등록하세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={selected.id}
              onUpdated={handleUpdated}
              onSelect={() => setSelectedTaskId(task.id)}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
