export type ThoughtRecord = {
  id: string;
  content: string;
  tags: string[];
  createdAt: Date;
};

export type TaskStatusValue = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type SessionLogRecord = {
  id: string;
  summary: string;
  aiTool: string;
  createdAt: Date;
};

export type TaskRecord = {
  id: string;
  seq: number;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatusValue;
  module: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
};
