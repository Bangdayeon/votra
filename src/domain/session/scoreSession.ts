/**
 * 세션의 품질·복잡도·이상 패턴을 하나의 score 와 status (green/yellow/red) 로 환산해요.
 *
 * 흐름
 *  1) raw metric 을 가중합으로 score 계산 (token·duration 은 log normalize 로 폭주 방지)
 *  2) score 구간으로 1차 status 판정
 *  3) critical 조건 (rollback / 동일 에러 반복 / retry loop / edit 폭증 / 토큰 급증)
 *     이 하나라도 걸리면 score 와 무관하게 red 로 override
 */

export type SessionScoreMetrics = {
  retryCount: number;
  editCount: number;
  errorCount: number;
  rollbackCount: number;
  tokenUsage: number;
  durationSec: number;

  // 이상 패턴 신호 — score 가중치 가장 큼
  repeatedErrorCount: number;
  retryLoopDepth: number;

  // 컨텍스트 정보. score 계산엔 미반영, 노드 표시·디버깅용
  branchCount: number;
  messageCount: number;
};

export type SessionStatus = "green" | "yellow" | "red";

export type SessionScore = {
  score: number;
  status: SessionStatus;
  /** red override 를 유발한 사유. 비어있으면 score 구간으로 판정된 결과 */
  criticalReasons: string[];
};

// 가중치. 실데이터 보면서 여기 숫자만 조정해도 색 분포 바뀜.
// edit / token 은 vibe coding 환경에서 자연스럽게 커지는 신호라 가중치 작게.
// retry / error / 이상패턴 (rollback·repeatedError·retryLoop) 만 크게.
const WEIGHTS = {
  retry: 2,
  edit: 0.3,
  error: 3,
  rollback: 6,
  repeatedError: 8,
  retryLoop: 10,
  token: 1,
  duration: 1,
} as const;

// score → status 경계. 일반 세션 ~10, 복잡 세션 ~35, 비정상 세션 60+ 가정.
const THRESHOLD = {
  yellow: 20,
  red: 60,
} as const;

// 한 항목이라도 이 값 이상이면 무조건 red (score 무시).
// edit / tokenSpike 는 1M context 환경 기준으로 후하게.
const CRITICAL = {
  rollback: 1,
  repeatedError: 5,
  retryLoop: 3,
  edit: 500,
  tokenSpike: 1_000_000,
} as const;

// token·duration 은 절대값이 너무 커서 그대로 곱하면 score 가 폭주.
// log1p 로 완만한 곡선으로 만들어 다른 metric 과 같은 scale 로 맞춤.
function normalizeToken(tokens: number): number {
  return Math.log1p(Math.max(0, tokens) / 1000);
}

function normalizeDuration(sec: number): number {
  return Math.log1p(Math.max(0, sec) / 60);
}

export function scoreSession(m: SessionScoreMetrics): SessionScore {
  const score =
    m.retryCount * WEIGHTS.retry +
    m.editCount * WEIGHTS.edit +
    m.errorCount * WEIGHTS.error +
    m.rollbackCount * WEIGHTS.rollback +
    m.repeatedErrorCount * WEIGHTS.repeatedError +
    m.retryLoopDepth * WEIGHTS.retryLoop +
    normalizeToken(m.tokenUsage) * WEIGHTS.token +
    normalizeDuration(m.durationSec) * WEIGHTS.duration;

  const criticalReasons: string[] = [];
  if (m.rollbackCount >= CRITICAL.rollback) {
    criticalReasons.push(`rollback ${m.rollbackCount}회 발생`);
  }
  if (m.repeatedErrorCount >= CRITICAL.repeatedError) {
    criticalReasons.push(`동일 에러 ${m.repeatedErrorCount}회 반복`);
  }
  if (m.retryLoopDepth >= CRITICAL.retryLoop) {
    criticalReasons.push(`retry loop 깊이 ${m.retryLoopDepth}`);
  }
  if (m.editCount >= CRITICAL.edit) {
    criticalReasons.push(`edit ${m.editCount}회 폭증`);
  }
  if (m.tokenUsage >= CRITICAL.tokenSpike) {
    criticalReasons.push(`토큰 ${m.tokenUsage.toLocaleString()} 급증`);
  }

  let status: SessionStatus;
  if (criticalReasons.length > 0) {
    status = "red";
  } else if (score >= THRESHOLD.red) {
    status = "red";
  } else if (score >= THRESHOLD.yellow) {
    status = "yellow";
  } else {
    status = "green";
  }

  return { score, status, criticalReasons };
}
