import type { ClaudeFileRow } from "@/application/ports/claudeFileRepository";
import type { LlmClient } from "@/application/ports/llmClient";
import { buildDocFlowView } from "@/application/views/buildDocFlowView";
import { DEFAULT_AGENT_CONTEXT_FLOW_PROMPT } from "@/domain/project/settings/defaultAgentContextFlowPrompt";
import { parseDoc } from "@/domain/doc/parseDoc";
import type { ParsedSession } from "@/domain/session/types";

const DOC_CONTENT_MAX = 3_000;

type RunInput = {
  teamPolicy: string;
  projectPolicy: string;
  contextFiles: ClaudeFileRow[];
  parsedSessions: ParsedSession[];
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
    maxTokens: 8192,
    responseFormat: "text",
  });
}

function fillTemplate(template: string, input: RunInput): string {
  const docs = input.contextFiles.map((f) =>
    parseDoc({ filePath: f.displayPath, content: f.content, lastModified: new Date() }),
  );
  const flowView = buildDocFlowView(docs, input.parsedSessions);

  return template
    .replace("{{team_policy}}", formatPolicy(input.teamPolicy))
    .replace("{{project_policy}}", formatPolicy(input.projectPolicy))
    .replace("{{context_files}}", formatContextFiles(input.contextFiles, input.parsedSessions))
    .replace("{{session_stats}}", formatSessionStats(input.parsedSessions))
    .replace("{{conversation_patterns}}", JSON.stringify(flowView, null, 2));
}

function formatPolicy(text: string): string {
  return text.trim() || "(정책 없음)";
}

function formatContextFiles(files: ClaudeFileRow[], sessions: ParsedSession[]): string {
  if (files.length === 0) return "(파일 없음)";

  // 최근 10개 세션에서 수정된 파일 경로 수집
  const recentFilePaths = new Set(
    [...sessions]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, 10)
      .flatMap((s) => s.filesModified),
  );

  // global·project-root는 항상 포함, subdir는 최근 세션에서 다룬 파일만 포함
  const relevant = files.filter(
    (f) =>
      f.scope === "global" ||
      f.scope === "project-root" ||
      recentFilePaths.has(f.displayPath),
  );
  const toFormat = relevant.length > 0 ? relevant : files;

  return toFormat
    .map((f) => {
      const content =
        f.content.length > DOC_CONTENT_MAX
          ? f.content.slice(0, DOC_CONTENT_MAX) + "\n…(truncated)"
          : f.content;
      return `### ${f.displayPath} (${f.kind}, ${f.scope})\n${content}`;
    })
    .join("\n\n---\n\n");
}

function formatSessionStats(sessions: ParsedSession[]): string {
  return JSON.stringify(
    {
      totalSessions: sessions.length,
      recentSessions: [...sessions]
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 5)
        .map((s) => ({
          title: s.title,
          errorCount: s.errors.length,
          filesModified: s.filesModified,
          intentHint: s.intentHint,
        })),
    },
    null,
    2,
  );
}
