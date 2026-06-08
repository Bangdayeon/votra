export type TaskStatusValue = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type MemoryTierValue = "ACTIVE" | "LONG_TERM" | "ARCHIVED" | "TRASH";

export type TaskSortBy = "priority" | "createdAt" | "updatedAt";

export type TaskListDateField = "createdAt" | "updatedAt";

export type TaskFilterOptions = {
  hideDone: boolean;
  status: "ALL" | TaskStatusValue;
  userId: string;
  priorityLevel: number | null;
  searchQuery: string;
  dateField: TaskListDateField;
  dateFrom?: Date;
  dateTo?: Date;
};

export type TaskRecord = {
  id: string;
  seq: number;
  projectId: string;
  userId: string;
  userName: string | null;
  userProfileImage: string | null;
  userProfileColor: string | null;
  title: string;
  description: string | null;
  status: TaskStatusValue;
  tool: string | null;
  priority: number;
  sortOrder: number;
  keyDecisions: string[];
  outcome: string | null;
  folderId: string | null;
  memoryTier: MemoryTierValue;
  accessCount: number;
  lastAccessedAt: Date | null;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
  deletedAt: Date | null;
};

export type FolderRecord = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  projectId: string;
  userId: string;
  taskCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectCommandRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  isBuiltIn: boolean;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectToolRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  patternSummary: string | null;
  contextHint: string | null;
  hookEvent: string | null;
  hookMatcher: string | null;
  hookScript: string | null;
  isEnabled: boolean;
  isBuiltIn: boolean;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
};
