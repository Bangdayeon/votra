import type { AgentContextFlowDiagnosisRepository } from "@/application/ports/projectAgentContextFlowDiagnosisRepository";

export type CachedAgentContextFlowDiagnosis = {
  result: string;
  refreshedAt: string;
} | null;

export async function getCachedAgentContextFlowDiagnosis(
  projectId: string,
  deps: { diagnoses: AgentContextFlowDiagnosisRepository },
): Promise<CachedAgentContextFlowDiagnosis> {
  const row = await deps.diagnoses.findByProject(projectId);
  if (!row) return null;
  return { result: row.result, refreshedAt: row.refreshedAt.toISOString() };
}
