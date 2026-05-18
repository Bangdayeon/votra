import type {
  ClaudeFileEvaluationRepository,
  ClaudeFileEvaluationRow,
} from "@/application/ports/claudeFileEvaluationRepository";
import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import type {
  ClaudeFileEvaluation,
  ClaudeFileRecord,
  EvaluationCriteria,
} from "@/domain/claudeFiles/types";

export type ListClaudeFilesResult = {
  records: ClaudeFileRecord[];
  /** 평가에 적용된 기준 레이어 — 캡션 문구 분기에 사용. */
  criteria: EvaluationCriteria;
};

const PENDING_CRITERIA: EvaluationCriteria = {
  basic: true,
  project: false,
  team: false,
};

export async function listClaudeFiles(
  projectId: string,
  deps: {
    claudeFiles: ClaudeFileRepository;
    evaluations: ClaudeFileEvaluationRepository;
  },
): Promise<ListClaudeFilesResult> {
  const [rows, existingEvals] = await Promise.all([
    deps.claudeFiles.findByProject(projectId),
    deps.evaluations.findByProject(projectId),
  ]);

  const evalByPath = new Map(existingEvals.map((e) => [e.absPath, e]));

  // 최신 criteria 는 가장 최근에 평가된 row 의 것으로 노출. 평가 row 가 없으면 기본값.
  const latestEval = existingEvals
    .filter((e) => e.evaluatedAt !== null)
    .sort((a, b) => (b.evaluatedAt ?? 0) - (a.evaluatedAt ?? 0))[0];
  const criteria = latestEval?.criteria ?? PENDING_CRITERIA;

  const records: ClaudeFileRecord[] = rows.map((r) => {
    const cached = evalByPath.get(r.absPath) ?? null;
    return {
      absPath: r.absPath,
      displayPath: r.displayPath,
      kind: r.kind,
      scope: r.scope,
      contentLength: r.content.length,
      mtime: r.mtime,
      evaluation: cached
        ? fromCached(cached)
        : { status: "PENDING", criteria: PENDING_CRITERIA },
    };
  });

  return { records, criteria };
}

function fromCached(cached: ClaudeFileEvaluationRow): ClaudeFileEvaluation {
  if (cached.status === "DONE" && cached.severity) {
    return {
      status: "DONE",
      severity: cached.severity,
      reason: cached.aiReason ?? "",
      scores: cached.scores ?? {},
      criteria: cached.criteria,
      globalPolicyViolation: cached.globalPolicyViolation,
      evaluatedAt: cached.evaluatedAt ?? 0,
    };
  }
  if (cached.status === "ERROR") {
    return {
      status: "ERROR",
      errorMessage: cached.errorMessage ?? "평가에 실패했어요.",
      criteria: cached.criteria,
      evaluatedAt: cached.evaluatedAt ?? 0,
    };
  }
  return {
    status: cached.status === "LOADING" ? "LOADING" : "PENDING",
    criteria: cached.criteria,
  };
}
