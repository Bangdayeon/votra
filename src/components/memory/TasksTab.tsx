"use client";

import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { deleteTaskAction } from "@/app/actions/deleteTask";
import { getProjectTasksAction, type TaskRecord, type TaskStatusValue } from "@/app/actions/getProjectTasks";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { filterTasks } from "@/domain/memory/filterTasks";
import { getTaskPriorityLevel } from "@/domain/memory/getTaskPriorityLevel";
import { sortTasks } from "@/domain/memory/sortTasks";
import type { TaskSortBy } from "@/domain/memory/types";
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

// ── TaskRow ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  projectId,
  expanded,
  onToggle,
  onUpdated,
  onDeleted,
}: {
  task: TaskRecord;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: (updated: TaskRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const nextStatus = NEXT_STATUS[task.status];
  const priorityLevel = getTaskPriorityLevel(task.priority);

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await deleteTaskAction(projectId, task.id);
      onDeleted(task.id);
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
                .then((reverted) => onUpdated(reverted))
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

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-shadow",
        task.status === "DONE" && "opacity-60",
      )}
    >
      <div
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3"
      >
        <StatusIcon status={task.status} className="shrink-0" />

        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            task.status === "DONE" && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          {priorityLevel > 0 && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                PRIORITY_STYLES[priorityLevel as 1 | 2 | 3 | 4],
              )}
            >
              {PRIORITY_LABELS[priorityLevel as 1 | 2 | 3 | 4]}
            </span>
          )}
          {task.module && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {task.module}
            </span>
          )}
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">
          {task.userName ?? "알 수 없음"}
        </span>

        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </div>

      {expanded && (
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
            <span>#{task.seq}</span>
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

          <div className="flex items-center justify-between pt-1">
            <div>
              {nextStatus && (
                <button
                  onClick={handleStatusClick}
                  disabled={loading}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <StatusIcon status={nextStatus} className="size-3.5" />
                  )}
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
                <DialogTitle>태스크 삭제</DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-foreground">{task.title}</span>
                  을(를) 완전히 삭제할까요? 되돌릴 수 없어요.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  취소
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
                  삭제
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
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

// ── sort ──────────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { label: string; value: TaskSortBy }[] = [
  { label: "중요도순", value: "priority" },
  { label: "등록일순", value: "createdAt" },
  { label: "수정일순", value: "updatedAt" },
];

// ── TasksTab ──────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | TaskStatusValue;

export function TasksTab({
  selected,
  initialTasks,
}: {
  selected: Project;
  initialTasks?: TaskRecord[];
}) {
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks ?? []);
  const [loading, setLoading] = useState(!initialTasks);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filterUser, setFilterUser] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [hideDone, setHideDone] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<TaskSortBy>("priority");

  // 기간 필터 (적용된 값)
  const [dateField, setDateField] = useState<"createdAt" | "updatedAt">("createdAt");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // 기간 팝오버 임시 값
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

  function applyDateFilter() {
    setDateField(tempDateField);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setDatePopoverOpen(false);
  }

  function cancelDateFilter() {
    setDatePopoverOpen(false);
  }

  const hasDateFilter = !!(dateFrom ?? dateTo);

  const loadTasks = useCallback((silent = false) => {
    let cancelled = false;
    if (!silent) setLoading(true);
    getProjectTasksAction(selected.id)
      .then((t) => { if (!cancelled) setTasks(t); })
      .catch((e: unknown) => {
        if (!cancelled && !silent) toast.error(e instanceof Error ? e.message : "태스크를 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled && !silent) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected.id]);

  const skipFirstFetch = useRef(!!initialTasks);
  useEffect(() => {
    if (skipFirstFetch.current) { skipFirstFetch.current = false; return; }
    return loadTasks();
  }, [loadTasks]);
  useProjectEvents(selected.id, () => loadTasks(true));

  function handleUpdated(updated: TaskRecord) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const creators = useMemo(() => {
    const seen = new Map<string, { name: string | null; image: string | null; color: string | null }>();
    tasks.forEach((t) => {
      if (!seen.has(t.userId)) {
        seen.set(t.userId, { name: t.userName, image: t.userProfileImage, color: t.userProfileColor });
      }
    });
    return Array.from(seen.entries()).map(([id, info]) => ({ id, ...info }));
  }, [tasks]);

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
    return filterTasks(tasks, {
      hideDone,
      status: filterStatus,
      userId: filterUser,
      priorityLevel: priorityNum,
      searchQuery,
      dateField,
      dateFrom,
      dateTo,
    });
  }, [tasks, hideDone, filterStatus, filterUser, filterPriority, searchQuery, dateFrom, dateTo, dateField]);

  const sorted = useMemo(() => sortTasks(filtered, sortBy), [filtered, sortBy]);

  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold shrink-0">태스크</h2>
        {!loading && (
          <div className="flex items-center gap-1.5">
            {inProgressCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 font-medium">
                진행 중 {inProgressCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                대기 {pendingCount}
              </span>
            )}
          </div>
        )}
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
              hasDateFilter
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}>
              <CalendarDays className="size-3" />
              {hasDateFilter
                ? [
                    dateFrom ? fmtDate(dateFrom) : "시작",
                    dateTo ? fmtDate(dateTo) : "종료",
                  ].join(" – ")
                : "기간 지정"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-4 cursor-default">
            <div className="flex flex-col gap-3 w-[240px]">
              {/* 기준 토글 */}
              <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
                {(["createdAt", "updatedAt"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTempDateField(f)}
                    className={cn(
                      "flex-1 py-1.5 transition-colors cursor-pointer",
                      tempDateField === f
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f === "createdAt" ? "등록일" : "수정일"}
                  </button>
                ))}
              </div>

              {/* 시작일 */}
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
                  <Calendar
                    mode="single"
                    selected={tempDateFrom}
                    onSelect={(d) => { setTempDateFrom(d); setActiveCalendar(null); }}
                    disabled={tempDateTo ? { after: tempDateTo } : undefined}
                  />
                )}
              </div>

              {/* 종료일 */}
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
                  <Calendar
                    mode="single"
                    selected={tempDateTo}
                    onSelect={(d) => { setTempDateTo(d); setActiveCalendar(null); }}
                    disabled={tempDateFrom ? { before: tempDateFrom } : undefined}
                  />
                )}
              </div>

              {/* 버튼 */}
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
                  <Button variant="outline" size="xs" onClick={cancelDateFilter}>취소</Button>
                  <Button size="xs" onClick={applyDateFilter}>완료</Button>
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

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <CheckSquare className="size-8 opacity-30" strokeWidth={1.5} />
          <p>조건에 맞는 태스크가 없어요.</p>
          <p className="text-xs">
            AI 도구에서 <code className="rounded bg-muted px-1 py-0.5">add_task</code> 또는{" "}
            <code className="rounded bg-muted px-1 py-0.5">brief</code> 툴로 등록하세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projectId={selected.id}
              expanded={expandedId === task.id}
              onToggle={() => setExpandedId((prev) => (prev === task.id ? null : task.id))}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
