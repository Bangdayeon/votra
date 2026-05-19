import type { ClaudeFileRow } from "@/application/ports/claudeFileRepository";
import type { LlmClient } from "@/application/ports/llmClient";
import type { SessionScoringRow } from "@/application/ports/sessionRepository";
import type { ProjectMetrics } from "@/application/getProjectMetrics";
import { DEFAULT_AGENT_CONTEXT_FLOW_PROMPT } from "@/domain/project/settings/defaultAgentContextFlowPrompt";

type RunInput = {
  teamPolicy: string;
  projectPolicy: string;
  contextFiles: ClaudeFileRow[];
  sessionStats: ProjectMetrics;
  scoringRows: SessionScoringRow[];
  promptTemplate: string | null;
};

export async function runAgentContextFlowDiagnosis(
  input: RunInput,
  deps: { llm: LlmClient },
): Promise<string> {
  const template =
    input.promptTemplate?.trim() || DEFAULT_AGENT_CONTEXT_FLOW_PROMPT;

  const prompt = fillTemplate(template, input);

  return deps.llm.complete({
    system:
      "주어진 형식에 맞춰 한국어로만 응답하세요. 형식 이외의 텍스트는 출력하지 마세요.",
    prompt,
    maxTokens: 2048,
    responseFormat: "text",
  });
}

function fillTemplate(template: string, input: RunInput): string {
  return template
    .replace("{{team_policy}}", formatPolicy(input.teamPolicy))
    .replace("{{project_policy}}", formatPolicy(input.projectPolicy))
    .replace("{{context_files}}", formatContextFiles(input.contextFiles))
    .replace("{{session_stats}}", formatSessionStats(input.sessionStats))
    .replace(
      "{{conversation_patterns}}",
      formatConversationPatterns(input.scoringRows),
    );
}

function formatPolicy(text: string): string {
  return text.trim() || "(정책 없음)";
}

function formatContextFiles(files: ClaudeFileRow[]): string {
  if (files.length === 0) return "(파일 없음)";
  return files
    .map((f) => `### ${f.displayPath} (${f.kind}, ${f.scope})\n${f.content}`)
    .join("\n\n---\n\n");
}

function formatSessionStats(metrics: ProjectMetrics): string {
  return JSON.stringify(
    {
      totalSessions: metrics.totals.sessionCount,
      totalTokens: metrics.totals.totalTokens,
      errorTypes: metrics.byErrorType,
      topSessions: [...metrics.sessions]
        .sort((a, b) => b.totalTokens - a.totalTokens)
        .slice(0, 5)
        .map((s) => ({
          title: s.title,
          model: s.model,
          totalTokens: s.totalTokens,
        })),
    },
    null,
    2,
  );
}

function formatConversationPatterns(rows: SessionScoringRow[]): string {
  const fileFreq = new Map<string, number>();
  let totalRetries = 0;

  for (const row of rows) {
    totalRetries += row.retryCount;
    for (const file of row.editedFiles) {
      fileFreq.set(file, (fileFreq.get(file) ?? 0) + 1);
    }
  }

  return JSON.stringify(
    {
      totalRetries,
      sessionsWithHighRetry: rows.filter((r) => r.retryCount > 2).length,
      frequentlyEditedFiles: [...fileFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([file, count]) => ({ file, editCount: count })),
    },
    null,
    2,
  );
}
