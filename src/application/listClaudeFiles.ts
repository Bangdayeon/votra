import { createHash } from "node:crypto";

import { ensureProjectGuideline } from "@/application/ensureProjectGuideline";
import { evaluateClaudeFile } from "@/application/evaluateClaudeFile";
import type {
  ClaudeFileEvaluationRepository,
  ClaudeFileEvaluationRow,
  ClaudeFileEvaluationUpsert,
} from "@/application/ports/claudeFileEvaluationRepository";
import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import type { LlmClient } from "@/application/ports/llmClient";
import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type {
  ClaudeFileEvaluation,
  ClaudeFileRecord,
  EvaluationCriteria,
} from "@/domain/claudeFiles/types";
import { buildDefaultGuideline } from "@/domain/policy/buildDefaultGuideline";
import type { PolicyRule } from "@/domain/policy/types";

export type ListClaudeFilesResult = {
  records: ClaudeFileRecord[];
  /** 평가에 적용된 기준 레이어 — 캡션 문구 분기에 사용. */
  criteria: EvaluationCriteria;
};

type GlobalPolicy = { text: string; fileContent: string | null } | null;

export async function listClaudeFiles(
  projectId: string,
  deps: {
    claudeFiles: ClaudeFileRepository;
    evaluations: ClaudeFileEvaluationRepository;
    projects: ProjectRepository;
    policyRules: PolicyRuleRepository;
    llm: LlmClient;
  },
): Promise<ListClaudeFilesResult> {
  const [rows, existingEvals, projectSettings, rules, globalPolicy] =
    await Promise.all([
      deps.claudeFiles.findByProject(projectId),
      deps.evaluations.findByProject(projectId),
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
  const globalPolicyHash = hashPolicy(globalPolicy);

  const criteria: EvaluationCriteria = {
    basic: true,
    project: guideline.trim() !== defaultGuideline.trim(),
    team: globalPolicy !== null,
  };

  const evalByPath = new Map(existingEvals.map((e) => [e.absPath, e]));

  // 캐시 hit 은 즉시 통과. miss/stale 한 파일만 LLM 호출. 무료 quota 회피 위해 직렬 처리.
  const records: Array<{
    record: ClaudeFileRecord;
    upsert: ClaudeFileEvaluationUpsert | null;
  }> = [];
  for (const r of rows) {
    records.push(
      await resolveEvaluation({
        projectId,
        file: {
          absPath: r.absPath,
          displayPath: r.displayPath,
          content: r.content,
          mtime: r.mtime,
          kind: r.kind,
          scope: r.scope,
        },
        cached: evalByPath.get(r.absPath) ?? null,
        guideline,
        rules,
        criteria,
        globalPolicy,
        globalPolicyHash,
        deps,
      }),
    );
  }

  const upserts = records
    .map((rec) => rec.upsert)
    .filter((u): u is ClaudeFileEvaluationUpsert => u !== null);
  if (upserts.length > 0) {
    await deps.evaluations.upsertMany(upserts);
  }

  return {
    records: records.map((rec) => rec.record),
    criteria,
  };
}

type ResolveInput = {
  projectId: string;
  file: {
    absPath: string;
    displayPath: string;
    content: string;
    mtime: number;
    kind: ClaudeFileRecord["kind"];
    scope: ClaudeFileRecord["scope"];
  };
  cached: ClaudeFileEvaluationRow | null;
  guideline: string;
  rules: PolicyRule[];
  criteria: EvaluationCriteria;
  globalPolicy: GlobalPolicy;
  globalPolicyHash: string | null;
  deps: { llm: LlmClient };
};

async function resolveEvaluation(input: ResolveInput): Promise<{
  record: ClaudeFileRecord;
  upsert: ClaudeFileEvaluationUpsert | null;
}> {
  const { cached, criteria, file, globalPolicyHash } = input;
  const isFresh =
    cached &&
    (cached.status === "DONE" || cached.status === "ERROR") &&
    !criteriaChanged(cached.criteria, criteria) &&
    (cached.evaluatedAt === null || cached.evaluatedAt >= file.mtime) &&
    // 휴리스틱 시절 DONE row 는 aiReason 이 없으니 강제로 stale 처리해 AI 재평가.
    (cached.status !== "DONE" || cached.aiReason !== null) &&
    // 전체 정책 본문이 바뀌면 위반 판정도 다시 받아야 해요.
    cached.globalPolicyHash === globalPolicyHash;

  if (isFresh && cached) {
    return {
      record: toRecord(file, fromCached(cached, criteria)),
      upsert: null,
    };
  }

  const now = Date.now();
  try {
    const result = await evaluateClaudeFile(
      {
        file: { displayPath: file.displayPath, content: file.content },
        guideline: input.guideline,
        rules: input.rules,
        globalPolicy: input.globalPolicy,
      },
      { llm: input.deps.llm },
    );
    const evaluation: ClaudeFileEvaluation = {
      status: "DONE",
      severity: result.severity,
      reason: result.reason,
      scores: result.scores,
      criteria,
      globalPolicyViolation: result.globalPolicyViolation,
      evaluatedAt: now,
    };
    return {
      record: toRecord(file, evaluation),
      upsert: {
        projectId: input.projectId,
        absPath: file.absPath,
        status: "DONE",
        severity: result.severity,
        errorMessage: null,
        aiReason: result.reason,
        scores: result.scores,
        criteria,
        globalPolicyHash,
        globalPolicyViolation: result.globalPolicyViolation,
        evaluatedAt: now,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "평가에 실패했어요.";
    const evaluation: ClaudeFileEvaluation = {
      status: "ERROR",
      errorMessage: message,
      criteria,
      evaluatedAt: now,
    };
    return {
      record: toRecord(file, evaluation),
      upsert: {
        projectId: input.projectId,
        absPath: file.absPath,
        status: "ERROR",
        severity: null,
        errorMessage: message,
        aiReason: null,
        scores: null,
        criteria,
        globalPolicyHash,
        globalPolicyViolation: null,
        evaluatedAt: now,
      },
    };
  }
}

function toRecord(
  file: ResolveInput["file"],
  evaluation: ClaudeFileEvaluation,
): ClaudeFileRecord {
  return {
    absPath: file.absPath,
    displayPath: file.displayPath,
    kind: file.kind,
    scope: file.scope,
    contentLength: file.content.length,
    mtime: file.mtime,
    evaluation,
  };
}

function fromCached(
  cached: ClaudeFileEvaluationRow,
  criteria: EvaluationCriteria,
): ClaudeFileEvaluation {
  if (cached.status === "DONE" && cached.severity) {
    return {
      status: "DONE",
      severity: cached.severity,
      reason: cached.aiReason ?? "",
      scores: cached.scores ?? {},
      criteria,
      globalPolicyViolation: cached.globalPolicyViolation,
      evaluatedAt: cached.evaluatedAt ?? 0,
    };
  }
  if (cached.status === "ERROR") {
    return {
      status: "ERROR",
      errorMessage: cached.errorMessage ?? "평가에 실패했어요.",
      criteria,
      evaluatedAt: cached.evaluatedAt ?? 0,
    };
  }
  return { status: cached.status === "LOADING" ? "LOADING" : "PENDING", criteria };
}

function criteriaChanged(a: EvaluationCriteria, b: EvaluationCriteria): boolean {
  return a.basic !== b.basic || a.project !== b.project || a.team !== b.team;
}

function hashPolicy(policy: GlobalPolicy): string | null {
  if (!policy) return null;
  const input = `${policy.text}${policy.fileContent ?? ""}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
