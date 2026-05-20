import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import type { LlmClient } from "@/application/ports/llmClient";
import type { AgentContextFlowDiagnosisRepository } from "@/application/ports/projectAgentContextFlowDiagnosisRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { SessionRepository } from "@/application/ports/sessionRepository";
import { runAgentContextFlowDiagnosis } from "@/application/runAgentContextFlowDiagnosis";
import { buildParsedSession } from "@/domain/session/buildParsedSession";

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
  const [sessionRows, settingsRow, contextFiles, ownerPolicy] =
    await Promise.all([
      deps.sessions.findRecentSessionsWithEvents(projectId, 20),
      deps.projects.findSettings(projectId),
      deps.claudeFiles.findByProject(projectId),
      deps.projects.findOwnerAiPolicy(projectId),
    ]);

  const parsedSessions = sessionRows.map(buildParsedSession);
  const teamPolicy = ownerPolicy
    ? [ownerPolicy.text, ownerPolicy.fileContent].filter(Boolean).join("\n\n")
    : "";

  const result = await runAgentContextFlowDiagnosis(
    {
      teamPolicy,
      projectPolicy: settingsRow.aiSpecGuideline ?? "",
      contextFiles,
      parsedSessions,
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
