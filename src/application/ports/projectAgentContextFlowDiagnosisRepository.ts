export type AgentContextFlowDiagnosisRecord = {
  result: string;
  refreshedAt: Date;
};

export type AgentContextFlowDiagnosisRepository = {
  findByProject: (projectId: string) => Promise<AgentContextFlowDiagnosisRecord | null>;
  upsert: (input: { projectId: string; result: string }) => Promise<AgentContextFlowDiagnosisRecord>;
};
