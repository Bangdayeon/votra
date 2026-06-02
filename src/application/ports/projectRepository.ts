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
  sortOrder: number;
  isFavorite: boolean;
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
  reorderProjects: (args: { userId: string; orderedIds: string[] }) => Promise<void>;
  setFavorite: (args: { userId: string; id: string; isFavorite: boolean }) => Promise<void>;
  findSettings: (id: string) => Promise<{
    settings: unknown;
    cwd: string | null;
  }>;

  findByCwd: (args: {
    cwd: string;
    ownerId: string;
  }) => Promise<IngestProjectRef | null>;
};
