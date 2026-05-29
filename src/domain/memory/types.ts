export type TaskStatusValue = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

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
  module: string | null;
  priority: number;
  sortOrder: number;
  keyDecisions: string[];
  outcome: string | null;
  folderId: string | null;
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

export type SkillRecord = {
  slug: string;
  name: string;
  description: string;
  category: string;
  contextHint: string;
  content: string;
  isActive: boolean;
  enabled: boolean;
};
