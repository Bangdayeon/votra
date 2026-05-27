import type { TaskRecord, TaskSortBy } from "@/domain/memory/types";

export function sortTasks(tasks: TaskRecord[], sortBy: TaskSortBy): TaskRecord[] {
  const copy = [...tasks];

  switch (sortBy) {
    case "createdAt":
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "updatedAt":
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    default:
      return copy;
  }
}
