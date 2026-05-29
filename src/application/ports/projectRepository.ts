export type IngestProjectRef = {
  id: string;
  ownerId: string;
};

export type ProjectListRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  structure: unknown;
  cwd: string | null;
  firstAgentSource: string | null;
  memberRole: string | null;
  lastCliSyncAt: Date | null;
};

export type ProjectCreateInput = {
  title: string;
  ownerId: string;
  description?: string;
  thumbnailUrl?: string;
  structure?: Record<string, unknown>;
  cwd?: string;
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
  /** undefined: 변경 없음. null: 파일 제거. 객체: 새 파일로 교체. */
  aiSpecFile?: { name: string; content: string } | null;
  /** undefined: 변경 없음. null/빈문자열: 제거. 문자열: 교체. */
  agentContextFlowPrompt?: string | null;
};

export type ProjectMemberRow = {
  userId: string;
  name: string | null;
  email: string;
  profileColor: string | null;
  profileImage: string | null;
  role: "OWNER" | "MEMBER";
  joinedAt: Date;
};

export type ProjectRepository = {
  list: (args: { userId: string }) => Promise<ProjectListRow[]>;
  findMembers: (projectId: string) => Promise<ProjectMemberRow[]>;
  findMemberRole: (input: { projectId: string; userId: string }) => Promise<"OWNER" | "MEMBER" | null>;
  countOwners: (projectId: string) => Promise<number>;
  updateMemberRole: (input: { projectId: string; targetUserId: string; newRole: "OWNER" | "MEMBER" }) => Promise<void>;
  removeMember: (input: { projectId: string; targetUserId: string }) => Promise<void>;
  create: (data: ProjectCreateInput) => Promise<string>;
  update: (input: ProjectUpdateInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
  findSettings: (id: string) => Promise<{
    settings: unknown;
    aiSpecGuideline: string | null;
    aiSpecFileName: string | null;
    agentContextFlowPrompt: string | null;
    cwd: string | null;
  }>;
  /**
   * 프로젝트 소유자의 "전체 정책" (User.aiPolicyText + aiPolicyFileContent) 을 합쳐서 반환해요.
   * 평가 시 전체 정책 위반 검사 입력으로 사용해요. 둘 다 null 이면 null.
   */
  findOwnerAiPolicy: (
    projectId: string,
  ) => Promise<{ text: string; fileContent: string | null } | null>;

  findByCwd: (args: {
    cwd: string;
    ownerId: string;
  }) => Promise<IngestProjectRef | null>;
};
