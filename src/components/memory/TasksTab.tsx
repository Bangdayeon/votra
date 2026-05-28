"use client";

import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { createFolderAction } from "@/app/actions/createFolderAction";
import { deleteFolderAction } from "@/app/actions/deleteFolderAction";
import { deleteTaskAction } from "@/app/actions/deleteTask";
import { getProjectFoldersAction } from "@/app/actions/getProjectFolders";
import { getProjectTasksAction, type TaskRecord, type TaskStatusValue } from "@/app/actions/getProjectTasks";
import { moveTaskToFolderAction } from "@/app/actions/moveTaskToFolderAction";
import { updateFolderAction } from "@/app/actions/updateFolderAction";
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
import type { Project } from "@/components/project/ProjectsContext";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { filterTasks } from "@/domain/memory/filterTasks";
import { getTaskPriorityLevel } from "@/domain/memory/getTaskPriorityLevel";
import { sortTasks } from "@/domain/memory/sortTasks";
import type { FolderRecord, TaskSortBy } from "@/domain/memory/types";
import { useProjectEvents } from "@/hooks/useProjectEvents";
import { cn } from "@/lib/utils";

// ── priority ──────────────────────────────────────────────────────────────────

type PriorityLevel = 0 | 1 | 2 | 3 | 4;

const PRIORITY_LABELS: Record<1 | 2 | 3 | 4, string> = {
  4: "Critical",
  3: "High",
  2: "Medium",
  1: "Low",
};

const PRIORITY_STYLES: Record<1 | 2 | 3 | 4, string> = {
  4: "bg-red-100 text-red-700",
  3: "bg-orange-100 text-orange-700",
  2: "bg-yellow-100 text-yellow-700",
  1: "bg-green-100 text-green-700",
};

// ── status ────────────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<TaskStatusValue, TaskStatusValue>> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "PENDING",
};

const STATUS_ACTION_LABELS: Record<TaskStatusValue, string> = {
  PENDING: "대기 상태로 변경",
  IN_PROGRESS: "진행 중으로 변경",
  DONE: "완료로 변경",
  CANCELLED: "취소로 변경",
};

const STATUS_TOAST_MESSAGES: Partial<Record<TaskStatusValue, string>> = {
  IN_PROGRESS: "진행 중으로 변경됐어요.",
  DONE: "완료로 변경됐어요.",
  PENDING: "대기로 변경됐어요.",
};

// ── folder view type ──────────────────────────────────────────────────────────

type FolderView =
  | { kind: "list" }
  | { kind: "folder"; id: string; name: string }
  | { kind: "unclassified" }
  | { kind: "all" };

// ── StatusIcon ────────────────────────────────────────────────────────────────

function StatusIcon({ status, className }: { status: TaskStatusValue; className?: string }) {
  if (status === "DONE") return <CheckSquare className={cn("size-4 text-green-600", className)} />;
  if (status === "IN_PROGRESS") return <Clock className={cn("size-4 text-blue-600", className)} />;
  if (status === "CANCELLED") return <XCircle className={cn("size-4 text-red-500", className)} />;
  return <Circle className={cn("size-4 text-muted-foreground", className)} />;
}

// ── FilterDropdown ────────────────────────────────────────────────────────────

function FilterDropdown<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap">
          {current?.icon && <span className="shrink-0">{current.icon}</span>}
          {current?.label}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn("gap-2", value === o.value && "font-medium")}
          >
            {o.icon && <span className="shrink-0">{o.icon}</span>}
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── CreateFolderDialog ────────────────────────────────────────────────────────

function CreateFolderDialog({
  open,
  projectId,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (folder: FolderRecord) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const folder = await createFolderAction(projectId, name.trim());
      onCreated(folder);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "폴더 생성에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>새 폴더</DialogTitle>
            <DialogDescription>폴더 이름을 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              autoFocus
              type="text"
              placeholder="폴더 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── FolderCard ────────────────────────────────────────────────────────────────

function FolderCard({
  folder,
  total,
  inProgress,
  pending,
  onClick,
  projectId,
  onRenamed,
  onDeleted,
}: {
  folder: FolderRecord | null;
  total: number;
  inProgress: number;
  pending: number;
  onClick: () => void;
  projectId: string;
  onRenamed?: (updated: FolderRecord) => void;
  onDeleted?: (id: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder?.name ?? "");
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!folder || !renameValue.trim()) return;
    setRenameLoading(true);
    try {
      const updated = await updateFolderAction(projectId, folder.id, renameValue.trim());
      onRenamed?.(updated);
      setRenaming(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "폴더 이름 변경에 실패했어요.");
    } finally {
      setRenameLoading(false);
    }
  }

  async function handleDelete() {
    if (!folder) return;
    setDeleteLoading(true);
    try {
      await deleteFolderAction(projectId, folder.id);
      onDeleted?.(folder.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "폴더 삭제에 실패했어요.");
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  }

  const isUnclassified = folder === null;

  return (
    <div
      onClick={renaming ? undefined : onClick}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-all",
        !renaming && "cursor-pointer hover:border-ring/40 hover:shadow-sm",
      )}
    >
      {/* icon */}
      <div className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        isUnclassified ? "bg-muted" : "bg-primary/10",
      )}>
        {isUnclassified
          ? <Folder className="size-4 text-muted-foreground" />
          : <FolderOpen className="size-4 text-primary" />
        }
      </div>

      {/* name + counts */}
      <div className="min-w-0 flex-1">
        {renaming && folder ? (
          <form onSubmit={handleRename} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="min-w-0 flex-1 rounded border border-ring bg-background px-2 py-0.5 text-sm font-medium focus:outline-none"
            />
            <button
              type="submit"
              disabled={renameLoading || !renameValue.trim()}
              className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-40"
            >
              {renameLoading ? <Loader2 className="size-3 animate-spin" /> : "저장"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRenaming(false); }}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              취소
            </button>
          </form>
        ) : (
          <p className="truncate text-sm font-medium">
            {folder?.name ?? "미분류"}
          </p>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{total}개</span>
          {inProgress > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-px text-blue-700 font-medium">
              진행 중 {inProgress}
            </span>
          )}
          {pending > 0 && inProgress === 0 && (
            <span className="text-muted-foreground">대기 {pending}</span>
          )}
        </div>
      </div>

      {/* right side: menu + chevron */}
      {!renaming && (
        <div className="flex shrink-0 items-center">
          {folder && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => { setRenameValue(folder.name); setRenaming(true); }}>
                  이름 변경
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* delete confirm */}
      {folder && (
        <Dialog open={deleteOpen} onOpenChange={(v) => { if (!v) setDeleteOpen(false); }}>
          <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>폴더 삭제</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{folder.name}</span>
                을(를) 삭제할까요? 폴더 안의 태스크는 미분류로 이동돼요.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  projectId,
  expanded,
  onToggle,
  onUpdated,
  onDeleted,
  folders,
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
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const nextStatus = NEXT_STATUS[task.status];
  const priorityLevel = getTaskPriorityLevel(task.priority);

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
        task.status === "DONE" && "opacity-60",
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
          {priorityLevel > 0 && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_STYLES[priorityLevel as 1 | 2 | 3 | 4])}>
              {PRIORITY_LABELS[priorityLevel as 1 | 2 | 3 | 4]}
            </span>
          )}
          {task.module && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {task.module}
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

          {/* folder move */}
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
                    : <StatusIcon status={nextStatus} className="size-3.5" />
                  }
                  {STATUS_ACTION_LABELS[nextStatus]}
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
              className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              삭제
            </Button>
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

// ── date helpers ─────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDateLong(d: Date) {
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

// ── sort / filter options ─────────────────────────────────────────────────────

const SORT_OPTIONS: { label: string; value: TaskSortBy }[] = [
  { label: "중요도순", value: "priority" },
  { label: "등록일순", value: "createdAt" },
  { label: "수정일순", value: "updatedAt" },
];

// ── TasksTab ──────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | TaskStatusValue;

const PAGE_SIZE = 20;

export function TasksTab({
  selected,
  initialTasks,
  isActive = true,
}: {
  selected: Project;
  initialTasks?: TaskRecord[];
  isActive?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks ?? []);
  const [loading, setLoading] = useState(!initialTasks);
  const [folders, setFolders] = useState<FolderRecord[]>([]);

  const [folderView, setFolderView] = useState<FolderView>(() => {
    const param = searchParams.get("folder");
    if (!param || param === "list") return { kind: "list" };
    if (param === "all") return { kind: "all" };
    if (param === "unclassified") return { kind: "unclassified" };
    return { kind: "list" }; // folder ID: resolved after folders load
  });

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkCreateAndMove, setBulkCreateAndMove] = useState(false);


  // filters (used in task list view)
  const [filterUser, setFilterUser] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [hideDone, setHideDone] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<TaskSortBy>("updatedAt");

  const [dateField, setDateField] = useState<"createdAt" | "updatedAt">("createdAt");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [tempDateField, setTempDateField] = useState<"createdAt" | "updatedAt">("createdAt");
  const [tempDateFrom, setTempDateFrom] = useState<Date | undefined>();
  const [tempDateTo, setTempDateTo] = useState<Date | undefined>();
  const [activeCalendar, setActiveCalendar] = useState<"from" | "to" | null>(null);

  function openDatePopover() {
    setTempDateField(dateField);
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setActiveCalendar(null);
    setDatePopoverOpen(true);
  }

  const hasDateFilter = !!(dateFrom ?? dateTo);

  const loadTasks = useCallback((silent = false) => {
    let cancelled = false;
    if (!silent) setLoading(true);
    getProjectTasksAction(selected.id)
      .then((t) => { if (!cancelled) { setTasks(t); setPage(1); } })
      .catch((e: unknown) => {
        if (!cancelled && !silent) toast.error(e instanceof Error ? e.message : "태스크를 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled && !silent) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected.id]);

  const loadFolders = useCallback(() => {
    getProjectFoldersAction(selected.id)
      .then(setFolders)
      .catch(() => { /* non-critical */ });
  }, [selected.id]);

  const skipFirstFetch = useRef(!!initialTasks);
  useEffect(() => {
    if (skipFirstFetch.current) { skipFirstFetch.current = false; return; }
    return loadTasks();
  }, [loadTasks]);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  // Resolve folder ID from URL once folders are loaded
  const appliedInitialFolder = useRef(false);
  useEffect(() => {
    if (appliedInitialFolder.current || folders.length === 0) return;
    const param = searchParams.get("folder");
    if (!param || ["list", "all", "unclassified"].includes(param)) return;
    appliedInitialFolder.current = true;
    const folder = folders.find((f) => f.id === param);
    if (folder) setFolderView({ kind: "folder", id: folder.id, name: folder.name });
  }, [folders, searchParams]);

  // Sync folderView → URL (only when tasks tab is active)
  useEffect(() => {
    if (!isActive) return;
    const next =
      folderView.kind === "list" ? null :
      folderView.kind === "all" ? "all" :
      folderView.kind === "unclassified" ? "unclassified" :
      folderView.id;
    const current = searchParams.get("folder");
    if (current === next) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === null) params.delete("folder");
    else params.set("folder", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [folderView, isActive, router, searchParams]);

  useProjectEvents(selected.id, () => { loadTasks(true); loadFolders(); });

  function handleUpdated(updated: TaskRecord) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }
  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }
  function handleFolderRenamed(updated: FolderRecord) {
    setFolders((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setFolderView((prev) =>
      prev.kind === "folder" && prev.id === updated.id
        ? { kind: "folder", id: updated.id, name: updated.name }
        : prev,
    );
  }
  function handleFolderDeleted(id: string) {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (folderView.kind === "folder" && folderView.id === id) {
      setFolderView({ kind: "list" });
    }
    loadTasks(true);
  }

  async function handleBulkStatusChange(newStatus: TaskStatusValue) {
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const updates = await Promise.all(
        ids.map((id) => {
          const task = tasks.find((t) => t.id === id);
          if (!task) return Promise.resolve(null);
          return updateTaskStatusAction(selected.id, task.seq, newStatus);
        }),
      );
      updates.forEach((u) => u && handleUpdated(u));
      setSelectedIds(new Set());
      toast.success(`${updates.filter(Boolean).length}개 상태를 변경했어요.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상태 변경에 실패했어요.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkMoveToFolder(folderId: string | null) {
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const updates = await Promise.all(
        ids.map((id) => {
          const task = tasks.find((t) => t.id === id);
          if (!task) return Promise.resolve(null);
          return moveTaskToFolderAction(selected.id, task.seq, folderId);
        }),
      );
      updates.forEach((u) => u && handleUpdated(u));
      setSelectedIds(new Set());
      toast.success("폴더를 변경했어요.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "폴더 이동에 실패했어요.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkDelete() {
    setBulkDeleteLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) => {
          const task = tasks.find((t) => t.id === id);
          if (!task) return Promise.resolve();
          return deleteTaskAction(selected.id, task.id);
        }),
      );
      ids.forEach((id) => handleDeleted(id));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setIsSelectMode(false);
      toast.success(`${ids.length}개를 휴지통으로 이동했어요.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했어요.");
    } finally {
      setBulkDeleteLoading(false);
    }
  }

  // per-folder stats from live tasks
  const folderStats = useMemo(() => {
    const map = new Map<string | null, { total: number; inProgress: number; pending: number }>();
    tasks.forEach((t) => {
      const key = t.folderId;
      const s = map.get(key) ?? { total: 0, inProgress: 0, pending: 0 };
      s.total++;
      if (t.status === "IN_PROGRESS") s.inProgress++;
      if (t.status === "PENDING") s.pending++;
      map.set(key, s);
    });
    return map;
  }, [tasks]);

  // tasks scoped to current folder view
  const scopedTasks = useMemo(() => {
    if (folderView.kind === "list") return [];
    if (folderView.kind === "all") return tasks;
    if (folderView.kind === "unclassified") return tasks.filter((t) => t.folderId === null);
    return tasks.filter((t) => t.folderId === folderView.id);
  }, [tasks, folderView]);

  const scopedInProgress = useMemo(
    () => scopedTasks.filter((t) => t.status === "IN_PROGRESS").length,
    [scopedTasks],
  );
  const scopedPending = useMemo(
    () => scopedTasks.filter((t) => t.status === "PENDING").length,
    [scopedTasks],
  );

  const creators = useMemo(() => {
    const seen = new Map<string, { name: string | null; image: string | null; color: string | null }>();
    scopedTasks.forEach((t) => {
      if (!seen.has(t.userId)) seen.set(t.userId, { name: t.userName, image: t.userProfileImage, color: t.userProfileColor });
    });
    return Array.from(seen.entries()).map(([id, info]) => ({ id, ...info }));
  }, [scopedTasks]);

  const creatorOptions = useMemo<{ label: string; value: string; icon?: React.ReactNode }[]>(
    () => [
      { label: "전체 팀원", value: "ALL" },
      ...creators.map(({ id, name, image, color }) => ({
        label: name ?? id,
        value: id,
        icon: (
          <span
            className="size-4 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: image ? undefined : color ? `#${color}` : "#6b7280" }}
          >
            {image
              ? <img src={image} alt="" className="size-full object-cover" />
              : (name ?? id)[0].toUpperCase()
            }
          </span>
        ),
      })),
    ],
    [creators],
  );

  const statusOptions: { label: string; value: StatusFilter; icon?: React.ReactNode }[] = [
    { label: "전체 상태", value: "ALL" },
    { label: "진행 중", value: "IN_PROGRESS", icon: <StatusIcon status="IN_PROGRESS" className="size-3" /> },
    { label: "대기", value: "PENDING", icon: <StatusIcon status="PENDING" className="size-3" /> },
    ...(!hideDone ? [{ label: "완료", value: "DONE" as StatusFilter, icon: <StatusIcon status="DONE" className="size-3" /> }] : []),
  ];

  const priorityOptions: { label: string; value: string; icon?: React.ReactNode }[] = [
    { label: "전체 중요도", value: "ALL" },
    { label: "Critical", value: "4", icon: <span className="inline-block size-2 shrink-0 rounded-full bg-red-500" /> },
    { label: "High", value: "3", icon: <span className="inline-block size-2 shrink-0 rounded-full bg-orange-400" /> },
    { label: "Medium", value: "2", icon: <span className="inline-block size-2 shrink-0 rounded-full bg-yellow-400" /> },
    { label: "Low", value: "1", icon: <span className="inline-block size-2 shrink-0 rounded-full bg-green-500" /> },
  ];

  const filtered = useMemo(() => {
    const priorityNum = filterPriority === "ALL" ? null : Number(filterPriority) as PriorityLevel;
    return filterTasks(scopedTasks, {
      hideDone,
      status: filterStatus,
      userId: filterUser,
      priorityLevel: priorityNum,
      searchQuery,
      dateField,
      dateFrom,
      dateTo,
    });
  }, [scopedTasks, hideDone, filterStatus, filterUser, filterPriority, searchQuery, dateFrom, dateTo, dateField]);

  const sorted = useMemo(() => sortTasks(filtered, sortBy), [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  useEffect(() => { setPage(1); }, [filterUser, filterStatus, filterPriority, hideDone, searchQuery, dateFrom, dateTo, dateField, sortBy, folderView]);

  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;

  const allStats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    return { total, inProgress, pending };
  }, [tasks]);

  // ── folder list view ──────────────────────────────────────────────────────

  if (folderView.kind === "list") {
    const unclassifiedStats = folderStats.get(null) ?? { total: 0, inProgress: 0, pending: 0 };

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">태스크</h2>
          {!loading && (
            <div className="flex items-center gap-1.5">
              {inProgressCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 font-medium">진행 중 {inProgressCount}</span>
              )}
              {pendingCount > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">대기 {pendingCount}</span>
              )}
            </div>
          )}
          <button
            onClick={() => setCreateFolderOpen(true)}
            className="ml-auto flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FolderPlus className="size-3.5" />
            새 폴더
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* 모든 태스크 */}
            <FolderCard
              folder={{ id: "__all__", name: "모든 태스크", sortOrder: -1, projectId: selected.id, userId: "", taskCount: allStats.total, createdAt: new Date(), updatedAt: new Date() }}
              total={allStats.total}
              inProgress={allStats.inProgress}
              pending={allStats.pending}
              onClick={() => setFolderView({ kind: "all" })}
              projectId={selected.id}
            />

            {folders.length > 0 && (
              <>
                {folders.map((folder) => {
                  const stats = folderStats.get(folder.id) ?? { total: 0, inProgress: 0, pending: 0 };
                  return (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      total={stats.total}
                      inProgress={stats.inProgress}
                      pending={stats.pending}
                      onClick={() => setFolderView({ kind: "folder", id: folder.id, name: folder.name })}
                      projectId={selected.id}
                      onRenamed={handleFolderRenamed}
                      onDeleted={handleFolderDeleted}
                    />
                  );
                })}
              </>
            )}

            {unclassifiedStats.total > 0 && (
              <>
                <FolderCard
                  folder={null}
                  total={unclassifiedStats.total}
                  inProgress={unclassifiedStats.inProgress}
                  pending={unclassifiedStats.pending}
                  onClick={() => setFolderView({ kind: "unclassified" })}
                  projectId={selected.id}
                />
              </>
            )}

            {tasks.length === 0 && folders.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
                <CheckSquare className="size-8 opacity-30" strokeWidth={1.5} />
                <p>아직 태스크가 없어요.</p>
                <p className="text-xs">
                  AI 도구에서 <code className="rounded bg-muted px-1 py-0.5">add_task</code> 툴로 등록하거나 폴더를 만들어보세요.
                </p>
              </div>
            )}
          </div>
        )}

        <CreateFolderDialog
          open={createFolderOpen}
          projectId={selected.id}
          onClose={() => setCreateFolderOpen(false)}
          onCreated={(folder) => {
            setFolders((prev) => [...prev, folder]);
            if (bulkCreateAndMove) {
              setBulkCreateAndMove(false);
              void handleBulkMoveToFolder(folder.id);
            }
          }}
        />
      </div>
    );
  }

  // ── task list view ────────────────────────────────────────────────────────

  const viewTitle =
    folderView.kind === "all"
      ? "모든 태스크"
      : folderView.kind === "unclassified"
      ? "미분류"
      : folderView.name;

  return (
    <div className="flex flex-col gap-4">
      {/* header with back */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setFolderView({ kind: "list" }); setIsSelectMode(false); setSelectedIds(new Set()); }}
          className="flex cursor-pointer items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <Folder className="size-4 shrink-0 text-muted-foreground" />
        <h2 className="text-base font-semibold">{viewTitle}</h2>
        <div className="flex items-center gap-1.5 ml-1">
          {scopedInProgress > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              진행 중 {scopedInProgress}
            </span>
          )}
          {scopedPending > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              대기 {scopedPending}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            if (isSelectMode) {
              setIsSelectMode(false);
              setSelectedIds(new Set());
            } else {
              setIsSelectMode(true);
              setExpandedId(null);
            }
          }}
          className="ml-auto flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {!isSelectMode && <CheckSquare className="size-3.5" />}
          {isSelectMode ? "취소" : "선택하기"}
        </button>
      </div>

      {/* 검색 */}
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="제목, 내용, 생성자 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-border bg-muted py-1 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown value={filterUser} options={creatorOptions} onChange={setFilterUser} />
        <FilterDropdown value={filterStatus} options={statusOptions} onChange={setFilterStatus} />
        <FilterDropdown value={filterPriority} options={priorityOptions} onChange={setFilterPriority} />
        <FilterDropdown value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />

        {/* 기간 지정 */}
        <Popover open={datePopoverOpen} onOpenChange={(open) => { if (open) openDatePopover(); else setDatePopoverOpen(false); }}>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              hasDateFilter ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:text-foreground",
            )}>
              <CalendarDays className="size-3" />
              {hasDateFilter
                ? [dateFrom ? fmtDate(dateFrom) : "시작", dateTo ? fmtDate(dateTo) : "종료"].join(" – ")
                : "기간 지정"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-4 cursor-default">
            <div className="flex flex-col gap-3 w-[240px]">
              <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
                {(["createdAt", "updatedAt"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTempDateField(f)}
                    className={cn(
                      "flex-1 py-1.5 transition-colors cursor-pointer",
                      tempDateField === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f === "createdAt" ? "등록일" : "수정일"}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">시작일</span>
                <button
                  onClick={() => setActiveCalendar((p) => p === "from" ? null : "from")}
                  className={cn(
                    "w-full rounded-md border px-3 py-1.5 text-left text-xs transition-colors cursor-pointer",
                    activeCalendar === "from" ? "border-ring" : "border-border hover:border-ring/50",
                    tempDateFrom ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tempDateFrom ? fmtDateLong(tempDateFrom) : "날짜 선택"}
                </button>
                {activeCalendar === "from" && (
                  <Calendar mode="single" selected={tempDateFrom}
                    onSelect={(d) => { setTempDateFrom(d); setActiveCalendar(null); }}
                    disabled={tempDateTo ? { after: tempDateTo } : undefined}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">종료일</span>
                <button
                  onClick={() => setActiveCalendar((p) => p === "to" ? null : "to")}
                  className={cn(
                    "w-full rounded-md border px-3 py-1.5 text-left text-xs transition-colors cursor-pointer",
                    activeCalendar === "to" ? "border-ring" : "border-border hover:border-ring/50",
                    tempDateTo ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tempDateTo ? fmtDateLong(tempDateTo) : "날짜 선택"}
                </button>
                {activeCalendar === "to" && (
                  <Calendar mode="single" selected={tempDateTo}
                    onSelect={(d) => { setTempDateTo(d); setActiveCalendar(null); }}
                    disabled={tempDateFrom ? { before: tempDateFrom } : undefined}
                  />
                )}
              </div>
              <div className="flex items-center justify-between pt-1">
                {hasDateFilter || tempDateFrom || tempDateTo ? (
                  <button
                    onClick={() => { setTempDateFrom(undefined); setTempDateTo(undefined); }}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    초기화
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <Button variant="outline" size="xs" onClick={() => setDatePopoverOpen(false)}>취소</Button>
                  <Button size="xs" onClick={() => {
                    setDateField(tempDateField);
                    setDateFrom(tempDateFrom);
                    setDateTo(tempDateTo);
                    setDatePopoverOpen(false);
                  }}>완료</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => {
              setHideDone(e.target.checked);
              if (e.target.checked && filterStatus === "DONE") setFilterStatus("ALL");
            }}
            className="size-3.5 rounded accent-foreground"
          />
          완료 숨기기
        </label>
      </div>

      {/* task list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <CheckSquare className="size-8 opacity-30" strokeWidth={1.5} />
          <p>조건에 맞는 태스크가 없어요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {paged.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projectId={selected.id}
              expanded={!isSelectMode && expandedId === task.id}
              onToggle={() => setExpandedId((prev) => (prev === task.id ? null : task.id))}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              folders={folders}
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(task.id)}
              onSelect={() => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(task.id)) next.delete(task.id);
                  else next.add(task.id);
                  return next;
                });
              }}
            />
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "flex size-7 cursor-pointer items-center justify-center rounded-md text-xs transition-colors",
                    p === page ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* bulk action bar */}
      {isSelectMode && (
        <div className={cn(
          "sticky bottom-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg transition-opacity",
          selectedIds.size === 0 && "opacity-60",
        )}>
          <span className="text-sm font-medium text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : "태스크를 선택하세요"}
          </span>
          {selectedIds.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="xs" disabled={bulkActionLoading}>
                    {bulkActionLoading && <Loader2 className="size-3 animate-spin" />}
                    상태 변경
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["IN_PROGRESS", "PENDING", "DONE"] as TaskStatusValue[]).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => handleBulkStatusChange(s)} className="gap-2">
                      <StatusIcon status={s} className="size-3.5" />
                      {s === "IN_PROGRESS" ? "진행 중" : s === "PENDING" ? "대기" : "완료"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="xs" disabled={bulkActionLoading}>
                    폴더 변경
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkMoveToFolder(null)} className="gap-2">
                    <Folder className="size-3.5" />
                    미분류
                  </DropdownMenuItem>
                  {folders.length > 0 && <DropdownMenuSeparator />}
                  {folders.map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => handleBulkMoveToFolder(f.id)} className="gap-2">
                      <Folder className="size-3.5" />
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setBulkCreateAndMove(true); setCreateFolderOpen(true); }}
                    className="gap-2"
                  >
                    <FolderPlus className="size-3.5" />
                    새 폴더 생성
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setBulkDeleteOpen(true)}
                className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                disabled={bulkActionLoading}
              >
                삭제
              </Button>
            </div>
          )}
        </div>
      )}

      {/* bulk delete dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(v) => !v && setBulkDeleteOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>휴지통으로 이동</DialogTitle>
            <DialogDescription>
              선택한 <span className="font-medium text-foreground">{selectedIds.size}개</span> 태스크를 휴지통으로 이동해요. 12일 후 자동으로 영구 삭제돼요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteLoading}>
              {bulkDeleteLoading && <Loader2 className="size-3.5 animate-spin" />}
              이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateFolderDialog
        open={createFolderOpen}
        projectId={selected.id}
        onClose={() => { setCreateFolderOpen(false); setBulkCreateAndMove(false); }}
        onCreated={(folder) => {
          setFolders((prev) => [...prev, folder]);
          if (bulkCreateAndMove) {
            setBulkCreateAndMove(false);
            void handleBulkMoveToFolder(folder.id);
          }
        }}
      />

    </div>
  );
}
