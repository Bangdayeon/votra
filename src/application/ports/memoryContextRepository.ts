export type MemoryContextRecord = {
  id: string;
  projectId: string;
  content: string;
  version: number;
  updatedAt: Date;
  serviceDescription: string | null;
  techStack: string | null;
  targetUsers: string | null;
  currentGoal: string | null;
};

export type MemoryContextRepository = {
  findByProject: (projectId: string) => Promise<MemoryContextRecord | null>;
  upsert: (args: {
    projectId: string;
    content?: string;
    serviceDescription?: string | null;
    techStack?: string | null;
    targetUsers?: string | null;
    currentGoal?: string | null;
  }) => Promise<MemoryContextRecord>;
};
