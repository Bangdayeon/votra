export type ProjectAiNextTaskRecord = {
  tasks: string[];
  refreshedAt: Date;
};

export type ProjectAiNextTaskUpsertInput = {
  projectId: string;
  tasks: string[];
};

export type ProjectAiNextTaskRepository = {
  findByProject: (projectId: string) => Promise<ProjectAiNextTaskRecord | null>;
  upsert: (input: ProjectAiNextTaskUpsertInput) => Promise<ProjectAiNextTaskRecord>;
};
