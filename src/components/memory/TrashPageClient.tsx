"use client";

import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getToolsAction } from "@/app/actions/getCustomCommandsAction";
import { listTrashedTasksPageAction } from "@/app/actions/listTrashedTasks";
import { purgeTaskAction } from "@/app/actions/purgeTask";
import { restoreTaskAction } from "@/app/actions/restoreTask";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskRecord, TaskStatusValue } from "@/domain/memory/types";
import { cn } from "@/lib/utils";
import { buildToolColorMap } from "@/shared/lib/toolBadgeColors";

const PRIORITY_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Low", 2: "Medium", 3: "High", 4: "Critical",
};
const PRIORITY_STYLES: Record<1 | 2 | 3 | 4, string> = {
  1: "bg-green-100 text-green-700", 2: "bg-yellow-100 text-yellow-700",
  3: "bg-orange-100 text-orange-700", 4: "bg-red-100 text-red-700",
};

function calcPriorityLevel(priority: number): 0 | 1 | 2 | 3 | 4 {
  if (priority <= 0) return 0;
  if (priority === 1) return 1;
  if (priority === 2) return 2;
  if (priority === 3) return 3;
  return 4;
}

function StatusIcon({ status }: { status: TaskStatusValue }) {
  if (status === "DONE") return <CheckSquare className="size-4 text-green-600" />;
  if (status === "IN_PROGRESS") return <Clock className="size-4 text-blue-600" />;
  if (status === "CANCELLED") return <XCircle className="size-4 text-red-500" />;
  return <Circle className="size-4 text-muted-foreground" />;
}

function calcDaysLeft(deletedAt: Date | null): number {
  if (!deletedAt) return 0;
  return Math.max(0, 12 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000));
}

const PAGE_SIZE = 20;
const UNDO_DELAY_MS = 4000;

export function TrashPageClient({
  projectId,
  initialTasks,
  initialTotal,
}: {
  projectId: string;
  initialTasks: TaskRecord[];
  initialTotal: number;
}) {
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [toolColorMap, setToolColorMap] = useState<Map<string, string>>(new Map());

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);
  const [bulkPurgeLoading, setBulkPurgeLoading] = useState(false);

  // 지연 삭제: taskId → timeout ID
  const purgeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadPage = useCallback(async (p: number, q = search) => {
    setLoading(true);
    try {
      const result = await listTrashedTasksPageAction(projectId, p, PAGE_SIZE, q || undefined);
      setTasks(result.tasks);
      setTotal(result.total);
      setPage(p);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "로드에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }, [projectId, search]);

  useEffect(() => {
    getToolsAction(projectId).then((tools) => setToolColorMap(buildToolColorMap(tools.map((t) => t.slug)))).catch(() => {});
  }, [projectId]);

  // 검색 디바운스
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    if (search === searchInput) void loadPage(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleRestore(taskId: string) {
    try {
      await restoreTaskAction(projectId, taskId);
      toast.success("태스크를 복원했어요.");
      await loadPage(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "복원에 실패했어요.");
    }
  }

  function handlePurgeOne(taskId: string) {
    const removed = tasks.find((t) => t.id === taskId);
    const newTotal = total - 1;
    const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
    const currentPage = page;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTotal(newTotal);

    if (currentPage > newTotalPages) {
      void loadPage(newTotalPages);
    }

    const existing = purgeTimers.current.get(taskId);
    if (existing) clearTimeout(existing);

    let undone = false;

    toast.success("영구 삭제됐어요.", {
      duration: UNDO_DELAY_MS,
      action: {
        label: "실행취소",
        onClick: () => {
          undone = true;
          clearTimeout(purgeTimers.current.get(taskId));
          purgeTimers.current.delete(taskId);
          if (removed) {
            if (currentPage > newTotalPages) {
              void loadPage(currentPage);
            } else {
              setTasks((prev) => [removed, ...prev]);
              setTotal((prev) => prev + 1);
            }
          }
        },
      },
    });

    const timer = setTimeout(() => {
      purgeTimers.current.delete(taskId);
      if (!undone) {
        purgeTaskAction(projectId, taskId).catch(() => {
          toast.error("삭제에 실패했어요.");
          void loadPage(page);
        });
      }
    }, UNDO_DELAY_MS);

    purgeTimers.current.set(taskId, timer);
  }

  async function handleBulkPurge() {
    setBulkPurgeLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const removed = tasks.filter((t) => ids.includes(t.id));
      const newTotal = total - ids.length;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      const currentPage = page;

      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
      setTotal(newTotal);
      setSelectedIds(new Set());
      setBulkPurgeOpen(false);
      setIsSelectMode(false);

      if (currentPage > newTotalPages) {
        void loadPage(newTotalPages);
      }

      let undone = false;

      toast.success(`${ids.length}개를 영구 삭제했어요.`, {
        duration: UNDO_DELAY_MS,
        action: {
          label: "실행취소",
          onClick: () => {
            undone = true;
            if (removed.length > 0) {
              if (currentPage > newTotalPages) {
                void loadPage(currentPage);
              } else {
                setTasks((prev) => [...removed, ...prev]);
                setTotal((prev) => prev + removed.length);
              }
            }
          },
        },
      });

      setTimeout(() => {
        if (!undone) {
          Promise.all(ids.map((id) => purgeTaskAction(projectId, id))).catch(() => {
            toast.error("일부 삭제에 실패했어요.");
            void loadPage(page);
          });
        }
      }, UNDO_DELAY_MS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했어요.");
    } finally {
      setBulkPurgeLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!loading && tasks.length === 0 && !search) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Trash2 className="size-10 opacity-30" />
        <p className="text-sm">휴지통이 비어 있어요.</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      {/* 검색 + 툴바 */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="태스크 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-full border border-border bg-muted py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">{total}개</p>
        <button
          onClick={() => { setIsSelectMode((v) => !v); setSelectedIds(new Set()); }}
          className="shrink-0 flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {!isSelectMode && <CheckSquare className="size-3.5" />}
          {isSelectMode ? "취소" : "선택하기"}
        </button>
      </div>

      {/* 전체 선택 바 */}
      {isSelectMode && !loading && tasks.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={tasks.every((t) => selectedIds.has(t.id))}
            readOnly
            onClick={() => {
              const allSelected = tasks.every((t) => selectedIds.has(t.id));
              if (allSelected) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(tasks.map((t) => t.id)));
              }
            }}
            className="size-4 cursor-pointer accent-foreground"
          />
          <span className="text-xs text-muted-foreground">전체 선택</span>
        </div>
      )}

      {/* 태스크 리스트 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">검색 결과가 없어요.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const pl = calcPriorityLevel(task.priority);
            const left = calcDaysLeft(task.deletedAt);
            const isSelected = selectedIds.has(task.id);
            return (
              <li
                key={task.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors",
                  isSelectMode && isSelected && "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
                )}
                onClick={isSelectMode ? () => toggleSelect(task.id) : undefined}
                style={isSelectMode ? { cursor: "pointer" } : undefined}
              >
                {isSelectMode && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    onClick={(e) => { e.stopPropagation(); toggleSelect(task.id); }}
                    className="size-4 shrink-0 cursor-pointer accent-foreground"
                  />
                )}
                <StatusIcon status={task.status} />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  {pl > 0 && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_STYLES[pl as 1 | 2 | 3 | 4])}>
                      {PRIORITY_LABELS[pl as 1 | 2 | 3 | 4]}
                    </span>
                  )}
                  {task.tool && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", toolColorMap.get(task.tool) ?? "bg-muted text-muted-foreground")}>
                      {task.tool}
                    </span>
                  )}
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    left <= 3 ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground",
                  )}>
                    {left === 0 ? "오늘 삭제" : `${left}일 후 삭제`}
                  </span>
                </div>
                {!isSelectMode && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => { e.stopPropagation(); void handleRestore(task.id); }}
                      className="text-xs"
                    >
                      <RotateCcw className="size-3.5" />
                      복원
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => { e.stopPropagation(); handlePurgeOne(task.id); }}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      영구 삭제
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <button
            onClick={() => void loadPage(page - 1)}
            disabled={page <= 1 || loading}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => void loadPage(p)}
              disabled={loading}
              className={cn(
                "flex size-7 cursor-pointer items-center justify-center rounded-md text-xs transition-colors disabled:pointer-events-none",
                p === page ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => void loadPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* 다중선택 하단 바 */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className={cn(
          "sticky bottom-4 mt-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg",
        )}>
          <span className="text-sm font-medium text-muted-foreground">{selectedIds.size}개 선택됨</span>
          <div className="ml-auto">
            <Button variant="ghost" size="xs" onClick={() => setBulkPurgeOpen(true)}
              className="bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 className="size-3.5" />영구 삭제
            </Button>
          </div>
        </div>
      )}

      {/* 벌크 영구 삭제 다이얼로그 */}
      <Dialog open={bulkPurgeOpen} onOpenChange={(v) => !v && setBulkPurgeOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>영구 삭제</DialogTitle>
            <DialogDescription>
              선택한 <span className="font-medium text-foreground">{selectedIds.size}개</span> 태스크를 영구 삭제할까요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPurgeOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={() => void handleBulkPurge()} disabled={bulkPurgeLoading}>
              {bulkPurgeLoading && <Loader2 className="size-3.5 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
