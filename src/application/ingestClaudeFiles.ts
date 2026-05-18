import { createHash } from "node:crypto";

import { ensureProjectGuideline } from "@/application/ensureProjectGuideline";
import { evaluateClaudeFile } from "@/application/evaluateClaudeFile";
import type {
  ClaudeFileEvaluationRepository,
  ClaudeFileEvaluationUpsert,
} from "@/application/ports/claudeFileEvaluationRepository";
import type {
  ClaudeFileInput,
  ClaudeFileRepository,
} from "@/application/ports/claudeFileRepository";
import type { LlmClient } from "@/application/ports/llmClient";
import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { EvaluationCriteria } from "@/domain/claudeFiles/types";
import { buildDefaultGuideline } from "@/domain/policy/buildDefaultGuideline";

export type IngestClaudeFilesInput = {
  projectId: string;
  files: ClaudeFileInput[];
};

type GlobalPolicy = { text: string; fileContent: string | null } | null;

/**
 * 파일 저장 + 변경된 파일만 LLM 평가.
 *
 * 정책: list 흐름은 순수 DB 읽기로 유지하기 위해, 평가는 오직 여기서만 일어나요.
 * incoming 파일을 기존 DB row 와 content 로 비교해 새/변경된 것만 LLM 호출 — 토큰 낭비 방지.
 */
export async function ingestClaudeFiles(
  input: IngestClaudeFilesInput,
  deps: {
    claudeFiles: ClaudeFileRepository;
    evaluations: ClaudeFileEvaluationRepository;
    projects: ProjectRepository;
    policyRules: PolicyRuleRepository;
    llm: LlmClient;
  },
): Promise<void> {
  const existing = await deps.claudeFiles.findByProject(input.projectId);
  const prevByPath = new Map(existing.map((r) => [r.absPath, r]));
  const changed = input.files.filter((f) => {
    const prev = prevByPath.get(f.absPath);
    return !prev || prev.content !== f.content;
  });

  await deps.claudeFiles.replaceAll(input.projectId, input.files);

  if (changed.length === 0) return;

  const [projectSettings, rules, globalPolicy] = await Promise.all([
    deps.projects.findSettings(input.projectId),
    deps.policyRules.list(),
    deps.projects.findOwnerAiPolicy(input.projectId),
  ]);
  const guideline = await ensureProjectGuideline(
    input.projectId,
    projectSettings.aiSpecGuideline,
    deps,
  );
  const defaultGuideline = buildDefaultGuideline(rules);
  const criteria: EvaluationCriteria = {
    basic: true,
    project: guideline.trim() !== defaultGuideline.trim(),
    team: globalPolicy !== null,
  };
  const globalPolicyHash = hashPolicy(globalPolicy);

  // 무료 quota 회피 위해 직렬 처리.
  const upserts: ClaudeFileEvaluationUpsert[] = [];
  for (const f of changed) {
    const now = Date.now();
    try {
      const result = await evaluateClaudeFile(
        {
          file: { displayPath: f.displayPath, content: f.content },
          guideline,
          rules,
          globalPolicy,
        },
        { llm: deps.llm },
      );
      upserts.push({
        projectId: input.projectId,
        absPath: f.absPath,
        status: "DONE",
        severity: result.severity,
        errorMessage: null,
        aiReason: result.reason,
        scores: result.scores,
        criteria,
        globalPolicyHash,
        globalPolicyViolation: result.globalPolicyViolation,
        evaluatedAt: now,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "평가에 실패했어요.";
      upserts.push({
        projectId: input.projectId,
        absPath: f.absPath,
        status: "ERROR",
        severity: null,
        errorMessage: message,
        aiReason: null,
        scores: null,
        criteria,
        globalPolicyHash,
        globalPolicyViolation: null,
        evaluatedAt: now,
      });
    }
  }

  if (upserts.length > 0) await deps.evaluations.upsertMany(upserts);
}

function hashPolicy(policy: GlobalPolicy): string | null {
  if (!policy) return null;
  const input = `${policy.text}${policy.fileContent ?? ""}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
