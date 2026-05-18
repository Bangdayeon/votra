import type { AgentKind } from "@/domain/agent/types";

export type IngestProjectRef = {
  id: string;
  ownerId: string;
};

export type IngestSessionInput = {
  /** raw jsonl sessionId — DB session 매핑 키로만 사용. */
  externalId: string;
  title?: string;
  model: string;
  startedAt?: Date;
  endedAt?: Date;
};

export type IngestEventInput = ProjectEventCreate;

export type IngestTokenDelta = {
  inputTokens: number;
  outputTokens: number;
};

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
  /** Prisma EventType — 세션 detail timeline 렌더링용. */
  type: "PROMPT" | "ASSISTANT" | "TOOL_CALL" | "FILE_EDIT" | "ERROR";
  occurredAt: Date;
  /** "user" | "assistant" | "system" 등 — DB Event.role */
  role?: string;
  /** PROMPT/ASSISTANT 본문 — UI 에서 보여줄 짧은 라벨 (saver 가 cap). */
  content?: string;
  path?: string;
  toolName?: string;
  /** TOOL_CALL raw input (capped). detail view 토글에서 동작 표시용. */
  toolInput?: unknown;
  /** TOOL_CALL 결과가 에러였는지 — detail view 색상에 사용. */
  isError?: boolean;
  errorType?: string;
  /** raw JSONL event uuid (또는 한 raw event 안의 sub-event 합성 uuid). 트리 분기 키. */
  uuid?: string;
  /** 부모 event uuid. fork 감지용. */
  parentUuid?: string;
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
  /** undefined: 변경 없음. null: 제거. 객체: 교체. */
  settings?: Record<string, unknown> | null;
  /** undefined: 변경 없음. null: 제거. 문자열: 교체. */
  aiSpecGuideline?: string | null;
};

export type ProjectRepository = {
  list: (args: { ownerId: string }) => Promise<ProjectListRow[]>;
  create: (data: ProjectCreateInput) => Promise<string>;
  update: (input: ProjectUpdateInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
  findSettings: (id: string) => Promise<{
    settings: unknown;
    aiSpecGuideline: string | null;
  }>;

  findByCwd: (args: {
    cwd: string;
    ownerId: string;
  }) => Promise<IngestProjectRef | null>;
  createForIngest: (input: {
    cwd: string;
    title: string;
    ownerId: string;
    agent: AgentKind;
  }) => Promise<IngestProjectRef>;
  upsertIngestSession: (input: {
    projectId: string;
    agent: AgentKind;
    session: IngestSessionInput;
  }) => Promise<string>;
  findExistingEventUuids: (
    sessionId: string,
    uuids: string[],
  ) => Promise<Set<string>>;
  appendEvents: (
    sessionId: string,
    events: IngestEventInput[],
  ) => Promise<number>;
  addTokenUsage: (sessionId: string, delta: IngestTokenDelta) => Promise<void>;
};
