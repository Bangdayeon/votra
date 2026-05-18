import { ensureProjectGuideline } from "@/application/ensureProjectGuideline";
import type { ClaudeFileEvaluationRepository } from "@/application/ports/claudeFileEvaluationRepository";
import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import { scoreClaudeFile } from "@/domain/claudeFiles/scoreClaudeFile";
import { severityFromScore } from "@/domain/claudeFiles/severityFromScore";
import type {
  ClaudeFileEvaluation,
  ClaudeFileRecord,
  EvaluationCriteria,
} from "@/domain/claudeFiles/types";
import { buildDefaultGuideline } from "@/domain/policy/buildDefaultGuideline";

export type ListClaudeFilesResult = {
  records: ClaudeFileRecord[];
  /** 평가에 적용된 기준 레이어 — 캡션 문구 분기에 사용. */
  criteria: EvaluationCriteria;
};

export async function listClaudeFiles(
  projectId: string,
  deps: {
    claudeFiles: ClaudeFileRepository;
    evaluations: ClaudeFileEvaluationRepository;
    projects: ProjectRepository;
    policyRules: PolicyRuleRepository;
  },
): Promise<ListClaudeFilesResult> {
  const [rows, existingEvals, projectSettings, rules] = await Promise.all([
    deps.claudeFiles.findByProject(projectId),
    deps.evaluations.findByProject(projectId),
    deps.projects.findSettings(projectId),
    deps.policyRules.list(),
  ]);

  // 비어 있으면 기본 지침을 채워 DB 에 저장. 이후 평가는 항상 "저장된 지침" 을 기준으로 동작.
  const guideline = await ensureProjectGuideline(
    projectId,
    projectSettings.aiSpecGuideline,
    deps,
  );
  const defaultGuideline = buildDefaultGuideline(rules);

  const criteria: EvaluationCriteria = {
    basic: true,
    project: guideline.trim() !== defaultGuideline.trim(),
    team: false, // 팀/회사 보안 지침 저장소가 생기면 이 자리에서 분기.
  };

  const evalByPath = new Map(existingEvals.map((e) => [e.absPath, e]));
  const now = Date.now();
  const upserts: Parameters<
    ClaudeFileEvaluationRepository["upsertMany"]
  >[0] = [];

  const records: ClaudeFileRecord[] = rows.map((r) => {
    const score = scoreClaudeFile(r.content, r.kind, r.mtime, now);
    const cached = evalByPath.get(r.absPath);
    const isStale =
      !cached ||
      cached.status === "PENDING" ||
      cached.status === "LOADING" ||
      criteriaChanged(cached.criteria, criteria) ||
      (cached.evaluatedAt !== null && cached.evaluatedAt < r.mtime);

    let evaluation: ClaudeFileEvaluation;

    if (cached && !isStale) {
      evaluation = fromCached(cached, criteria);
    } else {
      // 현재는 동기 휴리스틱이라 항상 DONE. 추후 비동기 LLM 평가로 바뀌면
      // 이 분기에서 LOADING 을 먼저 upsert 하고 작업 큐로 보내는 방식으로 확장.
      const severity = severityFromScore(score.total);
      evaluation = {
        status: "DONE",
        severity,
        criteria,
        evaluatedAt: now,
      };
      upserts.push({
        projectId,
        absPath: r.absPath,
        status: "DONE",
        severity,
        errorMessage: null,
        criteria,
        evaluatedAt: now,
      });
    }

    return {
      absPath: r.absPath,
      displayPath: r.displayPath,
      kind: r.kind,
      scope: r.scope,
      contentLength: r.content.length,
      mtime: r.mtime,
      score,
      evaluation,
    };
  });

  if (upserts.length > 0) {
    await deps.evaluations.upsertMany(upserts);
  }

  return { records, criteria };
}

function fromCached(
  cached: {
    status: "PENDING" | "LOADING" | "DONE" | "ERROR";
    severity: "OK" | "WARNING" | "DANGER" | null;
    errorMessage: string | null;
    evaluatedAt: number | null;
  },
  criteria: EvaluationCriteria,
): ClaudeFileEvaluation {
  if (cached.status === "DONE" && cached.severity) {
    return {
      status: "DONE",
      severity: cached.severity,
      criteria,
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
