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
import { buildDefaultGuideline } from "@/domain/policy/buildDefaultGuideline";

type GlobalPolicy = { text: string; fileContent: string | null } | null;

export async function reevaluateErrorClaudeFiles(
  projectId: string,
  deps: {
    claudeFiles: ClaudeFileRepository;
    evaluations: ClaudeFileEvaluationRepository;
    projects: ProjectRepository;
    policyRules: PolicyRuleRepository;
    llm: LlmClient;
  },
): Promise<void> {
  const [files, existingEvals] = await Promise.all([
    deps.claudeFiles.findByProject(projectId),
    deps.evaluations.findByProject(projectId),
  ]);

  const errorPaths = new Set(
    existingEvals.filter((e) => e.status === "ERROR").map((e) => e.absPath),
  );
  const toEvaluate = files.filter((f) => errorPaths.has(f.absPath));
  if (toEvaluate.length === 0) return;

  const [projectSettings, rules, globalPolicy] = await Promise.all([
    deps.projects.findSettings(projectId),
    deps.policyRules.list(),
    deps.projects.findOwnerAiPolicy(projectId),
  ]);
  const guideline = await ensureProjectGuideline(
    projectId,
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

  const upserts: ClaudeFileEvaluationUpsert[] = [];
  for (const f of toEvaluate) {
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
        projectId,
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
        projectId,
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
