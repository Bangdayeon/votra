"use client";

import { Archive, ChevronDown, ChevronRight, Folder, Loader2, Pin, PinOff, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { TaskRecord, TaskStatusValue } from "@/app/actions/getProjectTasks";
import { deleteTaskAction } from "@/app/actions/deleteTask";
import { moveTaskToFolderAction } from "@/app/actions/moveTaskToFolderAction";
import { pinTaskAction } from "@/app/actions/pinTaskAction";
import { updateTaskStatusAction } from "@/app/actions/updateTaskStatus";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FolderRecord } from "@/domain/memory/types";
import { getTaskPriorityLevel } from "@/domain/memory/getTaskPriorityLevel";
import { cn } from "@/lib/utils";

import { StatusIcon } from "./StatusIcon";
import {
  NEXT_STATUS,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  STATUS_ACTION_LABELS,
  STATUS_TOAST_MESSAGES,
} from "./taskConstants";

export function TaskRow({
  task,
  projectId,
  expanded,
  onToggle,
  onUpdated,
  onDeleted,
  folders,
  toolColorMap,
  isSelectMode,
  isSelected,
  onSelect,
}: {
  task: TaskRecord;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: (updated: TaskRecord) => void;
  onDeleted: (id: string) => void;
  folders: FolderRecord[];
  toolColorMap: Map<string, string>;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const nextStatus = NEXT_STATUS[task.status];
  const priorityLevel = getTaskPriorityLevel(task.priority);

  async function handleTogglePin(e: React.MouseEvent) {
    e.stopPropagation();
    setPinLoading(true);
    try {
      await pinTaskAction(projectId, task.id, !task.isPinned);
      onUpdated({ ...task, isPinned: !task.isPinned, memoryTier: !task.isPinned ? "LONG_TERM" : "ACTIVE" });
      toast.success(!task.isPinned ? "장기 기억으로 고정했어요." : "고정을 해제했어요.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "고정에 실패했어요.");
    } finally {
      setPinLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await deleteTaskAction(projectId, task.id);
      onDeleted(task.id);
      toast.success("휴지통으로 이동했어요.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했어요.");
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  }

  async function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!nextStatus || loading) return;
    setLoading(true);
    const prevStatus = task.status;
    try {
      const updated = await updateTaskStatusAction(projectId, task.seq, nextStatus);
      onUpdated(updated);
      const message = STATUS_TOAST_MESSAGES[nextStatus];
      if (message) {
        toast.success(message, {
          action: {
            label: <RotateCcw className="size-3.5" />,
            onClick: () => {
              void updateTaskStatusAction(projectId, task.seq, prevStatus)
                .then((r) => onUpdated(r))
                .catch((err) => toast.error(err instanceof Error ? err.message : "되돌리기에 실패했어요."));
            },
          },
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상태 변경에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveToFolder(folderId: string | null) {
    if (task.folderId === folderId) return;
    setMoveLoading(true);
    try {
      const updated = await moveTaskToFolderAction(projectId, task.seq, folderId);
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "폴더 이동에 실패했어요.");
    } finally {
      setMoveLoading(false);
    }
  }

  const currentFolderName = task.folderId
    ? (folders.find((f) => f.id === task.folderId)?.name ?? "알 수 없음")
    : "미분류";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-shadow",
        !isSelectMode && task.status === "DONE" && "opacity-60",
        isSelectMode && isSelected && "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
      )}
    >
      <div
        onClick={isSelectMode ? onSelect : onToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3"
      >
        {isSelectMode ? (
          <input
            type="checkbox"
            checked={isSelected}
            readOnly
            onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
            className="size-4 shrink-0 cursor-pointer accent-foreground"
          />
        ) : (
          <StatusIcon status={task.status} className="shrink-0" />
        )}
        <span className="shrink-0 text-xs text-muted-foreground">#{task.seq}</span>
        <p className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium",
          task.status === "DONE" && "line-through text-muted-foreground",
        )}>
          {task.title}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {task.memoryTier === "LONG_TERM" && (
            <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Pin className="size-3" />
              장기
            </span>
          )}
          {task.memoryTier === "ARCHIVED" && (
            <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Archive className="size-3" />
              보관
            </span>
          )}
          {priorityLevel > 0 && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_STYLES[priorityLevel as 1 | 2 | 3 | 4])}>
              {PRIORITY_LABELS[priorityLevel as 1 | 2 | 3 | 4]}
            </span>
          )}
          {task.tool && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", toolColorMap.get(task.tool) ?? "bg-muted text-muted-foreground")}>
              {task.tool}
            </span>
          )}
        </div>
        <span
          className="shrink-0 max-w-[80px] truncate text-xs text-muted-foreground"
          title={task.userName ?? undefined}
        >
          {task.userName && task.userName.length > 10
            ? `${task.userName.slice(0, 10)}…`
            : (task.userName ?? "알 수 없음")}
        </span>
        {!isSelectMode && (expanded
          ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.2s ease-in-out",
        }}
      >
        <div
          className={cn("overflow-hidden", !expanded && "pointer-events-none")}
          style={{ minHeight: 0 }}
          aria-hidden={!expanded}
        >
          <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">
            {task.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">등록일</span>{" "}
                {new Date(task.createdAt).toLocaleDateString("ko-KR")}
              </span>
              {new Date(task.updatedAt).getTime() !== new Date(task.createdAt).getTime() && (
                <span>
                  <span className="font-medium text-foreground">수정일</span>{" "}
                  {new Date(task.updatedAt).toLocaleDateString("ko-KR")}
                </span>
              )}
              {task.lastAccessedAt && (
                <span>
                  <span className="font-medium text-foreground">마지막 접근</span>{" "}
                  {new Date(task.lastAccessedAt).toLocaleDateString("ko-KR")}
                </span>
              )}
            </div>
            {task.outcome && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">결과</span>{" "}
                {task.outcome}
              </p>
            )}
            {task.keyDecisions.length > 0 && (
              <ul className="flex flex-col gap-1">
                {task.keyDecisions.map((d, i) => (
                  <li key={i} className="text-xs text-muted-foreground before:mr-1.5 before:content-['·']">
                    {d}
                  </li>
                ))}
              </ul>
            )}

            {folders.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">폴더</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      disabled={moveLoading}
                      className="flex cursor-pointer items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      {moveLoading ? <Loader2 className="size-3 animate-spin" /> : <Folder className="size-3" />}
                      {currentFolderName}
                      <ChevronDown className="size-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={() => handleMoveToFolder(null)}
                      className={cn(!task.folderId && "font-medium")}
                    >
                      미분류
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {folders.map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        onClick={() => handleMoveToFolder(f.id)}
                        className={cn(task.folderId === f.id && "font-medium")}
                      >
                        {f.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div>
                {nextStatus && (
                  <button
                    onClick={handleStatusClick}
                    disabled={loading}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                  >
                    {loading
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <StatusIcon status={nextStatus as TaskStatusValue} className="size-3.5" />
                    }
                    {STATUS_ACTION_LABELS[nextStatus]}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePin}
                  disabled={pinLoading}
                  className={cn(
                    "flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                    task.isPinned
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {pinLoading ? <Loader2 className="size-3.5 animate-spin" /> : task.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  {task.isPinned ? "고정 해제" : "장기 기억 고정"}
                </button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                  className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  삭제
                </Button>
              </div>
            </div>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>휴지통으로 이동</DialogTitle>
                  <DialogDescription>
                    <span className="font-medium text-foreground">{task.title}</span>
                    을(를) 휴지통으로 이동해요. 12일 후 자동으로 영구 삭제돼요.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                    {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
                    이동
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
