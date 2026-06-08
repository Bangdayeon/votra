export type ProjectAiInsightRow = {
  message: string;
  agentCommand: string;
};

export type ProjectAiSummaryRecord = {
  summary: string;
  warnings: ProjectAiInsightRow[];
  refreshedAt: Date;
};

export type ProjectAiSummaryUpsertInput = {
  projectId: string;
  summary: string;
  warnings: ProjectAiInsightRow[];
};

export type ProjectAiSummaryRepository = {
  findByProject: (projectId: string) => Promise<ProjectAiSummaryRecord | null>;
  upsert: (input: ProjectAiSummaryUpsertInput) => Promise<ProjectAiSummaryRecord>;
};
