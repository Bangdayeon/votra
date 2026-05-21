import { createHash } from "node:crypto";

import { ensureProjectGuideline } from "@/application/ensureProjectGuideline";
import { evaluateClaudeFile } from "@/application/evaluateClaudeFile";
import type {
  ClaudeFileEvaluationRepository,
  ClaudeFileEvaluationUpsert,
} from "@/application/ports/claudeFileEvaluationRepository";
import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import type { LlmClient } from "@/application/ports/llmClient";
import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { EvaluationCriteria } from "@/domain/claudeFiles/types";
import {
  classifyDocLevel,
  getDefaultAiSpecGuideline,
} from "@/domain/aiSpec/defaultAiSpecGuideline";
import { buildDefaultGuideline } from "@/domain/policy/buildDefaultGuideline";

type GlobalPolicy = { text: string; fileContent: string | null } | null;

export async function reevaluateClaudeFile(
  projectId: string,
  absPath: string,
  deps: {
    claudeFiles: ClaudeFileRepository;
    evaluations: ClaudeFileEvaluationRepository;
    projects: ProjectRepository;
    policyRules: PolicyRuleRepository;
    llm: LlmClient;
  },
): Promise<void> {
  const [files, projectSettings, rules, globalPolicy] = await Promise.all([
    deps.claudeFiles.findByProject(projectId),
    deps.projects.findSettings(projectId),
    deps.policyRules.list(),
    deps.projects.findOwnerAiPolicy(projectId),
  ]);

  const file = files.find((f) => f.absPath === absPath);
  if (!file) return;

  const savedGuideline = await ensureProjectGuideline(
    projectId,
    projectSettings.aiSpecGuideline,
    deps,
  );
  const defaultGuideline = buildDefaultGuideline(rules);
  const hasCustomGuideline = savedGuideline.trim() !== defaultGuideline.trim();
  const guideline = hasCustomGuideline
    ? savedGuideline
    : getDefaultAiSpecGuideline(classifyDocLevel(absPath));
  const criteria: EvaluationCriteria = {
    basic: true,
    project: hasCustomGuideline,
    team: globalPolicy !== null,
  };
  const globalPolicyHash = hashPolicy(globalPolicy);
  const now = Date.now();

  const result = await evaluateClaudeFile(
    {
      file: { displayPath: file.displayPath, content: file.content },
      guideline,
      rules,
      globalPolicy,
    },
    { llm: deps.llm },
  );

  await deps.evaluations.upsertMany([
    {
      projectId,
      absPath,
      status: "DONE",
      severity: result.severity,
      errorMessage: null,
      aiReason: result.reason,
      scores: result.scores,
      suggestions: result.suggestions,
      criteria,
      globalPolicyHash,
      globalPolicyViolation: result.globalPolicyViolation,
      evaluatedAt: now,
    },
  ]);
}

function hashPolicy(policy: GlobalPolicy): string | null {
  if (!policy) return null;
  const input = `${policy.text}${policy.fileContent ?? ""}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
