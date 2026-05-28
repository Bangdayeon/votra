import type { ClaudeFileRow } from "@/application/ports/claudeFileRepository";
import type { LlmClient } from "@/application/ports/llmClient";
import { DEFAULT_AGENT_CONTEXT_FLOW_PROMPT } from "@/domain/project/settings/defaultAgentContextFlowPrompt";

const DOC_CONTENT_MAX = 3_000;

type RunInput = {
  teamPolicy: string;
  projectPolicy: string;
  contextFiles: ClaudeFileRow[];
  promptTemplate: string | null;
};

export async function runAgentContextFlowDiagnosis(
  input: RunInput,
  deps: { llm: LlmClient },
): Promise<string> {
  const template = input.promptTemplate?.trim() || DEFAULT_AGENT_CONTEXT_FLOW_PROMPT;
  const prompt = fillTemplate(template, input);

  return deps.llm.complete({
    system: "주어진 형식에 맞춰 한국어로만 응답하세요. 형식 이외의 텍스트는 출력하지 마세요.",
    prompt,
    maxTokens: 2048,
    responseFormat: "text",
  });
}

function fillTemplate(template: string, input: RunInput): string {
  return template
    .replace("{{team_policy}}", formatPolicy(input.teamPolicy))
    .replace("{{project_policy}}", formatPolicy(input.projectPolicy))
    .replace("{{context_files}}", formatContextFiles(input.contextFiles));
}

function formatPolicy(text: string): string {
  return text.trim() || "(정책 없음)";
}

function formatContextFiles(files: ClaudeFileRow[]): string {
  if (files.length === 0) return "(파일 없음)";
  const relevant = files.filter((f) => f.scope === "global" || f.scope === "project-root");
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
