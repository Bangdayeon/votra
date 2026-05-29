import type { TaskRecord, TaskStatusValue } from "@/domain/memory/types";

export type TaskCreateInput = {
  title: string;
  description?: string;
  module?: string;
  priority?: number;
  folderId?: string;
  projectId: string;
  userId: string;
};

export type TaskUpdateInput = {
  seq: number;
  userId: string;
  title?: string;
  description?: string | null;
  status?: TaskStatusValue;
  module?: string | null;
  priority?: number;
  folderId?: string | null;
  keyDecisions?: string[];
  outcome?: string;
};

export type TaskListFilter = {
  projectId: string;
  userId?: string;
  status?: TaskStatusValue;
  module?: string;
  limit?: number;
  offset?: number;
};

export type TaskRepository = {
  create: (input: TaskCreateInput) => Promise<TaskRecord>;
  update: (input: TaskUpdateInput) => Promise<TaskRecord | null>;
  findBySeq: (args: { seq: number; projectId: string }) => Promise<TaskRecord | null>;
  listByFilter: (filter: TaskListFilter) => Promise<TaskRecord[]>;
  findRecentDone: (args: {
    projectId: string;
    userId: string;
    limit: number;
  }) => Promise<TaskRecord[]>;
  findRecentByUpdatedAt: (args: {
    projectId: string;
    userId?: string;
    limit: number;
  }) => Promise<TaskRecord[]>;
  search: (args: {
    query: string;
    projectId: string;
    userId: string;
    limit: number;
  }) => Promise<TaskRecord[]>;
};
