import type { MemoryTierValue, TaskRecord, TaskStatusValue } from "@/domain/memory/types";

export type TaskCreateInput = {
  title: string;
  description?: string;
  tool?: string;
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
  tool?: string | null;
  priority?: number;
  folderId?: string | null;
  keyDecisions?: string[];
  outcome?: string;
};

export type TaskListFilter = {
  projectId: string;
  userId?: string;
  status?: TaskStatusValue;
  tool?: string;
  limit?: number;
  offset?: number;
};

export type DecayCandidate = {
  id: string;
  isPinned: boolean;
  accessCount: number;
  priority: number;
  lastAccessedAt: Date | null;
  doneAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  memoryTier: MemoryTierValue;
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
  trackAccess: (taskId: string) => Promise<void>;
  batchUpdateMemoryTier: (updates: Array<{ id: string; tier: MemoryTierValue }>) => Promise<void>;
  updateMemoryTier: (args: { taskId: string; tier: MemoryTierValue; isPinned?: boolean }) => Promise<void>;
  listForDecay: (projectId: string) => Promise<DecayCandidate[]>;
  listByMemoryTier: (args: { projectId: string; tier: MemoryTierValue; limit?: number }) => Promise<TaskRecord[]>;
  countActivitySince: (args: { projectId: string; sinceDate: Date }) => Promise<number>;
};
