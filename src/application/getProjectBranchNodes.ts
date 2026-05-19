import type {
  SessionRepository,
  SessionScoringRow,
} from "@/application/ports/sessionRepository";
import {
  scoreSession,
  type SessionScoreMetrics,
  type SessionStatus,
} from "@/domain/session/scoreSession";

export type BranchErrorRow = {
  errorType: string;
  count: number;
};

/** 브랜치 그래프 노드 하나에 필요한 모든 화면 데이터. */
export type BranchNode = {
  id: string;
  status: SessionStatus;
  title: string;
  model: string;
  durationSec: number;
  totalTokens: number;
  editCount: number;
  startedAt: Date | null;
  /** FILE_EDIT 이벤트에서 추출한 unique 파일 경로 (등장 순). tooltip 표시용. */
  editedFiles: string[];
  errors: BranchErrorRow[];
};

/**
 * 프로젝트 세션을 시간순으로 가져와 그래프 노드 (status + tooltip) 배열로 변환.
 * DB 스키마 한계로 rollback / retryLoopDepth / branchCount 는 0.
 */
export async function getProjectBranchNodes(
  projectId: string,
  deps: { sessions: SessionRepository },
): Promise<BranchNode[]> {
  const rows = await deps.sessions.findScoringRowsByProject(projectId);
  return rows.map((row, idx) => {
    const metrics = toScoreMetrics(row);
    const { status } = scoreSession(metrics);
    return {
      id: row.id,
      status,
      title: row.title ?? `세션 ${idx + 1}`,
      model: row.model,
      durationSec: metrics.durationSec,
      totalTokens: row.totalTokens,
      editCount: row.editCount,
      startedAt: row.startedAt,
      editedFiles: row.editedFiles,
      errors: groupErrors(row.errorTypes),
    };
  });
}

function toScoreMetrics(row: SessionScoringRow): SessionScoreMetrics {
  return {
    retryCount: row.retryCount,
    editCount: row.editCount,
    errorCount: row.errorTypes.length,
    rollbackCount: 0,
    tokenUsage: row.totalTokens,
    durationSec: durationSec(row.startedAt, row.endedAt),
    repeatedErrorCount: countRepeated(row.errorTypes),
    retryLoopDepth: 0,
    branchCount: 0,
    messageCount: row.messageCount,
  };
}

function durationSec(startedAt: Date | null, endedAt: Date | null): number {
  if (!startedAt || !endedAt) return 0;
  const diff = endedAt.getTime() - startedAt.getTime();
  return Math.max(0, Math.round(diff / 1000));
}

function countRepeated(types: string[]): number {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  let repeated = 0;
  for (const c of counts.values()) {
    if (c >= 2) repeated += c - 1;
  }
  return repeated;
}

function groupErrors(types: string[]): BranchErrorRow[] {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([errorType, count]) => ({ errorType, count }))
    .sort((a, b) => b.count - a.count);
}
