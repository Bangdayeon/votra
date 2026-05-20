export type NextTask = {
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
  agentCommand: string;
};

export type ProjectAiNextTaskRecord = {
  tasks: NextTask[];
  refreshedAt: Date;
};

export type ProjectAiNextTaskUpsertInput = {
  projectId: string;
  tasks: NextTask[];
};

export type ProjectAiNextTaskRepository = {
  findByProject: (projectId: string) => Promise<ProjectAiNextTaskRecord | null>;
  upsert: (input: ProjectAiNextTaskUpsertInput) => Promise<ProjectAiNextTaskRecord>;
};
