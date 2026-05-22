export type ProjectInviteRow = {
  id: string;
  token: string;
  email: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  projectId: string;
  projectTitle: string;
  invitedById: string;
  invitedByName: string | null;
  createdAt: Date;
};

export type ProjectInviteRepository = {
  create: (input: {
    token: string;
    email: string | null;
    projectId: string;
    invitedById: string;
    expiresAt: Date;
  }) => Promise<string>;

  findByToken: (token: string) => Promise<ProjectInviteRow | null>;

  accept: (input: {
    token: string;
    acceptedById: string;
  }) => Promise<{ projectId: string; projectTitle: string }>;

  listByProject: (projectId: string) => Promise<ProjectInviteRow[]>;

  deleteExpired: (projectId: string) => Promise<void>;
};
