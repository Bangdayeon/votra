import { getTaskPriorityLevel } from "@/domain/memory/getTaskPriorityLevel";
import type { TaskFilterOptions, TaskRecord } from "@/domain/memory/types";

export function filterTasks(tasks: TaskRecord[], options: TaskFilterOptions): TaskRecord[] {
  const q = options.searchQuery.toLowerCase();
  const fromMs = options.dateFrom ? new Date(options.dateFrom).setHours(0, 0, 0, 0) : null;
  const toMs = options.dateTo ? new Date(options.dateTo).setHours(23, 59, 59, 999) : null;

  return tasks.filter((task) => {
    if (options.hideDone && (task.status === "DONE" || task.status === "CANCELLED")) return false;
    if (options.status !== "ALL" && task.status !== options.status) return false;
    if (options.userId !== "ALL" && task.userId !== options.userId) return false;
    if (options.priorityLevel !== null && getTaskPriorityLevel(task.priority) !== options.priorityLevel) return false;

    if (fromMs !== null || toMs !== null) {
      const fieldMs = new Date(task[options.dateField]).getTime();
      if (fromMs !== null && fieldMs < fromMs) return false;
      if (toMs !== null && fieldMs > toMs) return false;
    }

    if (q) {
      const inTitle = task.title.toLowerCase().includes(q);
      const inDesc = task.description?.toLowerCase().includes(q) ?? false;
      const inUser = (task.userName ?? "").toLowerCase().includes(q);
      if (!inTitle && !inDesc && !inUser) return false;
    }

    return true;
  });
}
