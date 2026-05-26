export type TaskStatusValue = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type SessionLogRecord = {
  id: string;
  sessionId: string | null;
  summary: string;
  aiTool: string;
  createdAt: Date;
  updatedAt: Date;
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
  keyDecisions: string[];
  outcome: string | null;
  createdAt: Date;
  updatedAt: Date;
  doneAt: Date | null;
};
