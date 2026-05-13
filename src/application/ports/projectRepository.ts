import type { AgentKind } from "@/domain/agent/types";

export type ProjectListRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  structure: unknown;
  cwd: string | null;
  firstAgentSource: string | null;
};

export type SessionErrorCreate = {
  errorType: string;
  errorMessage?: string;
  occurredAt: Date;
};

export type ProjectEventCreate = {
  /** Prisma EventType — 일단 파일 수정 (`FILE_EDIT`) 만 저장. 필요시 확장. */
  type: "FILE_EDIT";
  occurredAt: Date;
  path?: string;
  toolName?: string;
};

export type ProjectSessionCreate = {
  title?: string;
  model: string;
  startedAt?: Date;
  endedAt?: Date;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  errors?: SessionErrorCreate[];
  events?: ProjectEventCreate[];
};

export type ProjectCreateInput = {
  title: string;
  ownerId: string;
  description?: string;
  thumbnailUrl?: string;
  structure?: Record<string, unknown>;
  cwd?: string;
  agent: AgentKind;
  sessions: ProjectSessionCreate[];
};

export type ProjectUpdateInput = {
  id: string;
  title?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  /** undefined: 변경 없음. null: 제거. 객체: 교체. */
  structure?: Record<string, unknown> | null;
};

export type ProjectRepository = {
  list: () => Promise<ProjectListRow[]>;
  create: (data: ProjectCreateInput) => Promise<string>;
  update: (input: ProjectUpdateInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
};
