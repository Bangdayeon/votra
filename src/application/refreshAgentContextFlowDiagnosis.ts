import { getProjectMetrics } from "@/application/getProjectMetrics";
import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import type { LlmClient } from "@/application/ports/llmClient";
import type { AgentContextFlowDiagnosisRepository } from "@/application/ports/projectAgentContextFlowDiagnosisRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { SessionRepository } from "@/application/ports/sessionRepository";
import { runAgentContextFlowDiagnosis } from "@/application/runAgentContextFlowDiagnosis";

export type RefreshedAgentContextFlowDiagnosis = {
  result: string;
  refreshedAt: string;
};

export async function refreshAgentContextFlowDiagnosis(
  projectId: string,
  deps: {
    sessions: SessionRepository;
    projects: ProjectRepository;
    claudeFiles: ClaudeFileRepository;
    diagnoses: AgentContextFlowDiagnosisRepository;
    llm: LlmClient;
  },
): Promise<RefreshedAgentContextFlowDiagnosis> {
  const [metrics, settingsRow, contextFiles, scoringRows, ownerPolicy] =
    await Promise.all([
      getProjectMetrics(projectId, { sessions: deps.sessions }),
      deps.projects.findSettings(projectId),
      deps.claudeFiles.findByProject(projectId),
      deps.sessions.findScoringRowsByProject(projectId),
      deps.projects.findOwnerAiPolicy(projectId),
    ]);

  const teamPolicy = ownerPolicy
    ? [ownerPolicy.text, ownerPolicy.fileContent].filter(Boolean).join("\n\n")
    : "";

  const result = await runAgentContextFlowDiagnosis(
    {
      teamPolicy,
      projectPolicy: settingsRow.aiSpecGuideline ?? "",
      contextFiles,
      sessionStats: metrics,
      scoringRows,
      promptTemplate: settingsRow.agentContextFlowPrompt,
    },
    { llm: deps.llm },
  );

  const saved = await deps.diagnoses.upsert({ projectId, result });
  return {
    result: saved.result,
    refreshedAt: saved.refreshedAt.toISOString(),
  };
}
