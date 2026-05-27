"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  GripVertical,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getProjectTasksAction, type TaskRecord, type TaskStatusValue } from "@/app/actions/getProjectTasks";
import { updateTaskOrderAction } from "@/app/actions/updateTaskOrder";
import { updateTaskStatusAction } from "@/app/actions/updateTaskStatus";
import type { Project } from "@/components/project/ProjectsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectEvents } from "@/hooks/useProjectEvents";
import { cn } from "@/lib/utils";

// ── priority ──────────────────────────────────────────────────────────────────

type PriorityLevel = 0 | 1 | 2 | 3 | 4;

function getPriorityLevel(p: number): PriorityLevel {
  if (p <= 0) return 0;
  if (p === 1) return 1;
  if (p <= 3) return 2;
  if (p <= 6) return 3;
  return 4;
}

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
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap">
          {current?.label}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(value === o.value && "font-medium")}
          >
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
  dragHandleProps,
  isDragging,
}: {
  task: TaskRecord;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: (updated: TaskRecord) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const nextStatus = NEXT_STATUS[task.status];
  const priorityLevel = getPriorityLevel(task.priority);

  async function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!nextStatus || loading) return;
    setLoading(true);
    try {
      const updated = await updateTaskStatusAction(projectId, task.seq, nextStatus);
      onUpdated(updated);
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
        isDragging && "shadow-lg opacity-80",
      )}
    >
      {/* 접힌 행 */}
      <div
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3"
      >
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        )}

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

      {/* 펼친 상세 */}
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

          {nextStatus && (
            <div className="pt-1">
              <button
                onClick={handleStatusClick}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <StatusIcon status={nextStatus} className="size-3.5" />
                )}
                {STATUS_ACTION_LABELS[nextStatus]}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SortableTaskRow ───────────────────────────────────────────────────────────

function SortableTaskRow(props: Omit<React.ComponentProps<typeof TaskRow>, "dragHandleProps" | "isDragging"> & { id: string }) {
  const { id, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <TaskRow
        {...rest}
        dragHandleProps={{ ...(attributes as React.HTMLAttributes<HTMLButtonElement>), ...(listeners as React.HTMLAttributes<HTMLButtonElement>) }}
        isDragging={isDragging}
      />
    </div>
  );
}

// ── sort ──────────────────────────────────────────────────────────────────────

type SortBy = "priority" | "createdAt" | "updatedAt" | "manual";

const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: "중요도순", value: "priority" },
  { label: "등록일순", value: "createdAt" },
  { label: "수정일순", value: "updatedAt" },
  { label: "수동 순서", value: "manual" },
];

function sortTasks(list: TaskRecord[], sortBy: SortBy): TaskRecord[] {
  const copy = [...list];
  switch (sortBy) {
    case "createdAt":
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "updatedAt":
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case "manual":
      return copy.sort((a, b) => {
        if (a.sortOrder === 0 && b.sortOrder === 0) return a.seq - b.seq;
        if (a.sortOrder === 0) return 1;
        if (b.sortOrder === 0) return -1;
        return a.sortOrder - b.sortOrder;
      });
    case "priority":
    default:
      return copy; // DB가 priority desc, seq asc 로 이미 정렬
  }
}

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
  const [activeId, setActiveId] = useState<string | null>(null);

  const [filterUser, setFilterUser] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [hideDone, setHideDone] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("priority");

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

  const skipFirstFetch = useRef(!!initialTasks);
  useEffect(() => {
    if (skipFirstFetch.current) { skipFirstFetch.current = false; return; }
    return loadTasks();
  }, [loadTasks]);
  useProjectEvents(selected.id, loadTasks);

  function handleUpdated(updated: TaskRecord) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  const creators = useMemo(() => {
    const seen = new Map<string, string | null>();
    tasks.forEach((t) => seen.set(t.userId, t.userName));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const creatorOptions = useMemo<{ label: string; value: string }[]>(
    () => [
      { label: "전체 팀원", value: "ALL" },
      ...creators.map(({ id, name }) => ({ label: name ?? id, value: id })),
    ],
    [creators],
  );

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: "전체 상태", value: "ALL" },
    { label: "진행 중", value: "IN_PROGRESS" },
    { label: "대기", value: "PENDING" },
    ...(!hideDone ? [{ label: "완료", value: "DONE" as StatusFilter }] : []),
  ];

  const priorityOptions: { label: string; value: string }[] = [
    { label: "전체 중요도", value: "ALL" },
    { label: "Critical", value: "4" },
    { label: "High", value: "3" },
    { label: "Medium", value: "2" },
    { label: "Low", value: "1" },
  ];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const priorityNum = filterPriority === "ALL" ? null : Number(filterPriority) as PriorityLevel;
    return tasks.filter((t) => {
      if (hideDone && (t.status === "DONE" || t.status === "CANCELLED")) return false;
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
      if (filterUser !== "ALL" && t.userId !== filterUser) return false;
      if (priorityNum !== null && getPriorityLevel(t.priority) !== priorityNum) return false;
      if (q) {
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = t.description?.toLowerCase().includes(q) ?? false;
        const inUser = (t.userName ?? "").toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inUser) return false;
      }
      return true;
    });
  }, [tasks, hideDone, filterStatus, filterUser, filterPriority, searchQuery]);

  const sorted = useMemo(() => sortTasks(filtered, sortBy), [filtered, sortBy]);

  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingCount = tasks.filter((t) => t.status === "PENDING").length;

  // ── DnD ──────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((t) => t.id === active.id);
    const newIndex = sorted.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sorted, oldIndex, newIndex);
    const newOrders = reordered.map((t, i) => ({ id: t.id, sortOrder: (i + 1) * 1000 }));
    const orderMap = new Map(newOrders.map((o) => [o.id, o.sortOrder]));

    setTasks((prev) =>
      prev.map((t) => (orderMap.has(t.id) ? { ...t, sortOrder: orderMap.get(t.id)! } : t)),
    );

    updateTaskOrderAction(selected.id, newOrders).catch(() => {
      toast.error("순서 저장에 실패했어요.");
    });
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

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
      ) : sortBy === "manual" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {sorted.map((task) => (
                <SortableTaskRow
                  key={task.id}
                  id={task.id}
                  task={task}
                  projectId={selected.id}
                  expanded={expandedId === task.id}
                  onToggle={() => setExpandedId((prev) => (prev === task.id ? null : task.id))}
                  onUpdated={handleUpdated}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeTask && (
              <TaskRow
                task={activeTask}
                projectId={selected.id}
                expanded={false}
                onToggle={() => {}}
                onUpdated={() => {}}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
