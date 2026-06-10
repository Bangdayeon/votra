"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderPlus,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { deleteTaskAction } from "@/app/actions/deleteTask";
import { getProjectFoldersAction } from "@/app/actions/getProjectFolders";
import { getProjectTasksAction, type TaskRecord, type TaskStatusValue } from "@/app/actions/getProjectTasks";
import { getToolsAction } from "@/app/actions/getToolsAction";
import { moveTaskToFolderAction } from "@/app/actions/moveTaskToFolderAction";
import { reorderFoldersAction } from "@/app/actions/reorderFoldersAction";
import { updateTaskStatusAction } from "@/app/actions/updateTaskStatus";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/components/project/ProjectsContext";
import { filterTasks } from "@/domain/memory/filterTasks";
import { sortTasks } from "@/domain/memory/sortTasks";
import type { FolderRecord, ProjectToolRecord, TaskSortBy } from "@/domain/memory/types";
import { useProjectEvents } from "@/hooks/useProjectEvents";
import { cn } from "@/lib/utils";
import { buildToolColorMap } from "@/shared/lib/toolBadgeColors";

import { CreateFolderDialog } from "./tasks/FolderDialogs";
import { CreateTaskDialog } from "./tasks/CreateTaskDialog";
import { FolderCard, SortableFolderCard } from "./tasks/FolderCard";
import { FilterDropdown } from "./tasks/FilterDropdown";
import { StatusIcon } from "./tasks/StatusIcon";
import { TaskRow } from "./tasks/TaskRow";
import {
  SORT_OPTIONS,
  PAGE_SIZE,
  fmtDate,
  fmtDateLong,
  type FolderView,
  type PriorityLevel,
  type StatusFilter,
} from "./tasks/taskConstants";

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
  const [tools, setTools] = useState<ProjectToolRecord[]>([]);

  const [folderView, setFolderView] = useState<FolderView>(() => {
    const param = searchParams.get("folder");
    if (!param || param === "list") return { kind: "list" };
    if (param === "all") return { kind: "all" };
    if (param === "unclassified") return { kind: "unclassified" };
    return { kind: "list" };
  });

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskDefaultFolderId, setCreateTaskDefaultFolderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkCreateAndMove, setBulkCreateAndMove] = useState(false);

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
  useEffect(() => { getToolsAction(selected.id).then(setTools).catch(() => {}); }, [selected.id]);

  const appliedInitialFolder = useRef(false);
  useEffect(() => {
    if (appliedInitialFolder.current || folders.length === 0) return;
    const param = searchParams.get("folder");
    if (!param || ["list", "all", "unclassified"].includes(param)) return;
    appliedInitialFolder.current = true;
    const folder = folders.find((f) => f.id === param);
    if (folder) setFolderView({ kind: "folder", id: folder.id, name: folder.name });
  }, [folders, searchParams]);

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

  const toolColorMap = useMemo(() => buildToolColorMap(tools.map((t) => t.slug)), [tools]);

  function handleUpdated(updated: TaskRecord) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }
  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }
  function handleTaskCreated(task: TaskRecord) {
    setTasks((prev) => [task, ...prev]);
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

  const folderDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleFolderDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = folders.findIndex((f) => f.id === active.id);
    const newIdx = folders.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(folders, oldIdx, newIdx);
    setFolders(reordered);
    void reorderFoldersAction(selected.id, reordered.map((f) => f.id)).catch(() =>
      toast.error("폴더 순서 변경에 실패했어요."),
    );
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

  const allCreatorOptions = useMemo<{ label: string; value: string; icon?: React.ReactNode }[]>(
    () => [
      { label: "전체 팀원", value: "ALL" },
      ...Array.from(
        new Map(tasks.map((t) => [t.userId, { name: t.userName, image: t.userProfileImage, color: t.userProfileColor }])).entries()
      ).map(([id, info]) => ({
        label: info.name ?? id,
        value: id,
        icon: (
          <span
            className="size-4 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: info.image ? undefined : info.color ? `#${info.color}` : "#6b7280" }}
          >
            {info.image
              ? <img src={info.image} alt="" className="size-full object-cover" />
              : (info.name ?? id)[0].toUpperCase()
            }
          </span>
        ),
      })),
    ],
    [tasks],
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
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setCreateFolderOpen(true)}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <FolderPlus className="size-3.5" />
              새 폴더
            </button>
            <button
              onClick={() => { setCreateTaskDefaultFolderId(null); setCreateTaskOpen(true); }}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-3.5" />
              새 태스크
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="제목, 내용, 생성자 검색"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setFolderView({ kind: "all" });
              }}
              className="w-full rounded-full border border-border bg-muted py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              value={filterUser}
              options={allCreatorOptions}
              onChange={(v) => { setFilterUser(v); if (v !== "ALL") setFolderView({ kind: "all" }); }}
            />
            <FilterDropdown
              value={filterStatus}
              options={statusOptions}
              onChange={(v) => { setFilterStatus(v); if (v !== "ALL") setFolderView({ kind: "all" }); }}
            />
            <FilterDropdown
              value={filterPriority}
              options={priorityOptions}
              onChange={(v) => { setFilterPriority(v); if (v !== "ALL") setFolderView({ kind: "all" }); }}
            />
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
                <DateRangePopoverContent
                  tempDateField={tempDateField}
                  setTempDateField={setTempDateField}
                  tempDateFrom={tempDateFrom}
                  setTempDateFrom={setTempDateFrom}
                  tempDateTo={tempDateTo}
                  setTempDateTo={setTempDateTo}
                  activeCalendar={activeCalendar}
                  setActiveCalendar={setActiveCalendar}
                  hasDateFilter={hasDateFilter}
                  onApply={() => {
                    setDateField(tempDateField);
                    setDateFrom(tempDateFrom);
                    setDateTo(tempDateTo);
                    if (tempDateFrom || tempDateTo) setFolderView({ kind: "all" });
                    setDatePopoverOpen(false);
                  }}
                  onCancel={() => setDatePopoverOpen(false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="flex flex-col gap-3 flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <FolderCard
              folder={{ id: "__all__", name: "모든 태스크", icon: null, color: null, sortOrder: -1, projectId: selected.id, userId: "", taskCount: allStats.total, createdAt: new Date(), updatedAt: new Date() }}
              total={allStats.total}
              inProgress={allStats.inProgress}
              pending={allStats.pending}
              onClick={() => setFolderView({ kind: "all" })}
              projectId={selected.id}
            />

            {unclassifiedStats.total > 0 && (
              <FolderCard
                folder={null}
                total={unclassifiedStats.total}
                inProgress={unclassifiedStats.inProgress}
                pending={unclassifiedStats.pending}
                onClick={() => setFolderView({ kind: "unclassified" })}
                projectId={selected.id}
              />
            )}

            {folders.length > 0 && (
              <div className="flex items-center justify-center my-3">
                <div className="size-2 rounded-full bg-border" />
              </div>
            )}

            {folders.length > 0 && (
              <DndContext
                sensors={folderDndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFolderDragEnd}
              >
                <SortableContext items={folders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {folders.map((folder) => {
                      const stats = folderStats.get(folder.id) ?? { total: 0, inProgress: 0, pending: 0 };
                      return (
                        <SortableFolderCard
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
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {tasks.length === 0 && folders.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
                <CheckSquare className="size-8 opacity-30" strokeWidth={1.5} />
                <p>아직 태스크가 없어요.</p>
                <p className="text-xs">새 태스크 버튼으로 바로 등록해보세요.</p>
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
        <CreateTaskDialog
          open={createTaskOpen && folderView.kind === "list"}
          projectId={selected.id}
          folders={folders}
          defaultFolderId={createTaskDefaultFolderId}
          tools={tools}
          onClose={() => setCreateTaskOpen(false)}
          onCreated={handleTaskCreated}
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
        <div className="ml-auto flex items-center gap-1">
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
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {!isSelectMode && <CheckSquare className="size-3.5" />}
            {isSelectMode ? "취소" : "선택하기"}
          </button>
          {!isSelectMode && (
            <button
              onClick={() => {
                const defaultId = folderView.kind === "folder" ? folderView.id : null;
                setCreateTaskDefaultFolderId(defaultId);
                setCreateTaskOpen(true);
              }}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-3.5" />
              새 태스크
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="제목, 내용, 생성자 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-border bg-muted py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown value={filterUser} options={creatorOptions} onChange={setFilterUser} />
          <FilterDropdown value={filterStatus} options={statusOptions} onChange={setFilterStatus} />
          <FilterDropdown value={filterPriority} options={priorityOptions} onChange={setFilterPriority} />
          <FilterDropdown value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />

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
              <DateRangePopoverContent
                tempDateField={tempDateField}
                setTempDateField={setTempDateField}
                tempDateFrom={tempDateFrom}
                setTempDateFrom={setTempDateFrom}
                tempDateTo={tempDateTo}
                setTempDateTo={setTempDateTo}
                activeCalendar={activeCalendar}
                setActiveCalendar={setActiveCalendar}
                hasDateFilter={hasDateFilter}
                onApply={() => {
                  setDateField(tempDateField);
                  setDateFrom(tempDateFrom);
                  setDateTo(tempDateTo);
                  setDatePopoverOpen(false);
                }}
                onCancel={() => setDatePopoverOpen(false)}
              />
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
      </div>

      {isSelectMode && sorted.length > 0 && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={paged.length > 0 && paged.every((t) => selectedIds.has(t.id))}
            readOnly
            onClick={() => {
              const allSelected = paged.every((t) => selectedIds.has(t.id));
              if (allSelected) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(paged.map((t) => t.id)));
              }
            }}
            className="size-4 cursor-pointer accent-foreground"
          />
          <span className="text-xs text-muted-foreground">전체 선택</span>
        </div>
      )}

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
              toolColorMap={toolColorMap}
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

      {isSelectMode && selectedIds.size > 0 && (
        <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
          <span className="text-sm font-medium text-muted-foreground">{selectedIds.size}개 선택됨</span>
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
        </div>
      )}

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
      <CreateTaskDialog
        open={createTaskOpen}
        projectId={selected.id}
        folders={folders}
        defaultFolderId={createTaskDefaultFolderId}
        tools={tools}
        onClose={() => setCreateTaskOpen(false)}
        onCreated={handleTaskCreated}
      />
    </div>
  );
}

// ── DateRangePopoverContent ───────────────────────────────────────────────────

function DateRangePopoverContent({
  tempDateField,
  setTempDateField,
  tempDateFrom,
  setTempDateFrom,
  tempDateTo,
  setTempDateTo,
  activeCalendar,
  setActiveCalendar,
  hasDateFilter,
  onApply,
  onCancel,
}: {
  tempDateField: "createdAt" | "updatedAt";
  setTempDateField: (v: "createdAt" | "updatedAt") => void;
  tempDateFrom: Date | undefined;
  setTempDateFrom: (v: Date | undefined) => void;
  tempDateTo: Date | undefined;
  setTempDateTo: (v: Date | undefined) => void;
  activeCalendar: "from" | "to" | null;
  setActiveCalendar: (v: "from" | "to" | null) => void;
  hasDateFilter: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
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
          onClick={() => setActiveCalendar(activeCalendar === "from" ? null : "from")}
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
          onClick={() => setActiveCalendar(activeCalendar === "to" ? null : "to")}
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
          <Button variant="outline" size="xs" onClick={onCancel}>취소</Button>
          <Button size="xs" onClick={onApply}>완료</Button>
        </div>
      </div>
    </div>
  );
}
