export const GEMINI_ERROR_MESSAGES = {
  /** HTTP 429 — 분당 요청 수 초과 */
  RATE_LIMIT_PER_MINUTE: "분당 최대 요청 수에 도달했어요. 잠시 후 다시 시도해 주세요.",
  /** HTTP 429 — 일일 요청 수 초과 */
  RATE_LIMIT_PER_DAY: "일일 최대 요청 수에 도달했어요. 내일 다시 시도해 주세요.",
  /** HTTP 429 — 분당 입력 토큰 한도 초과 */
  RATE_LIMIT_TOKENS_PER_MINUTE:
    "분당 토큰 한도에 도달했어요. 잠시 후 다시 시도해 주세요.",
  /** HTTP 429 — quotaId 식별 실패 시 폴백 */
  RATE_LIMIT_UNKNOWN: "요청 한도에 도달했어요. 잠시 후 다시 시도해 주세요.",
  /** HTTP 503 — 모델 과부하 (Spikes in demand) */
  SERVICE_UNAVAILABLE: "시간당 최대 요청 수에 도달했어요. 잠시 후 다시 시도해 주세요.",
  /** HTTP 401 / 403 */
  UNAUTHORIZED: "AI 인증에 실패했어요. API 키 설정을 확인해 주세요.",
  /** HTTP 400 */
  BAD_REQUEST: "AI 요청 형식이 잘못됐어요.",
  /** HTTP 404 */
  NOT_FOUND: "사용 중인 AI 모델을 찾을 수 없어요.",
  /** HTTP 408 / 504 */
  TIMEOUT: "AI 응답이 시간 초과됐어요. 잠시 후 다시 시도해 주세요.",
  /** HTTP 500 / 기타 5xx */
  INTERNAL_ERROR:
    "AI 서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.",
  /** finishReason === "MAX_TOKENS" */
  MAX_TOKENS:
    "AI 응답이 토큰 한도에서 잘렸어요. 다시 시도하거나 프롬프트를 줄여 주세요.",
  /** finishReason === "SAFETY" */
  SAFETY: "AI 응답이 안전 필터에 걸렸어요.",
  /** finishReason === "RECITATION" */
  RECITATION: "AI 응답이 인용 정책에 걸렸어요.",
  /** 그 외 모든 케이스 */
  UNKNOWN: "AI 응답에 실패했어요. 잠시 후 다시 시도해 주세요.",
} as const;

export type GeminiErrorKey = keyof typeof GEMINI_ERROR_MESSAGES;

export function geminiMessageForStatus(status: number, body: string): string {
  switch (status) {
    case 400:
      return GEMINI_ERROR_MESSAGES.BAD_REQUEST;
    case 401:
    case 403:
      return GEMINI_ERROR_MESSAGES.UNAUTHORIZED;
    case 404:
      return GEMINI_ERROR_MESSAGES.NOT_FOUND;
    case 408:
    case 504:
      return GEMINI_ERROR_MESSAGES.TIMEOUT;
    case 429:
      return geminiMessageForRateLimit(body);
    case 503:
      return GEMINI_ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    default:
      if (status >= 500) return GEMINI_ERROR_MESSAGES.INTERNAL_ERROR;
      return GEMINI_ERROR_MESSAGES.UNKNOWN;
  }
}

/** 429 응답 body 에서 quotaId 를 보고 분당/일일/토큰 한도를 구분. */
function geminiMessageForRateLimit(body: string): string {
  if (/PerDay/i.test(body)) return GEMINI_ERROR_MESSAGES.RATE_LIMIT_PER_DAY;
  if (/InputTokens.*PerMinute/i.test(body))
    return GEMINI_ERROR_MESSAGES.RATE_LIMIT_TOKENS_PER_MINUTE;
  if (/PerMinute/i.test(body))
    return GEMINI_ERROR_MESSAGES.RATE_LIMIT_PER_MINUTE;
  return GEMINI_ERROR_MESSAGES.RATE_LIMIT_UNKNOWN;
}

export function geminiMessageForFinishReason(reason: string): string {
  switch (reason) {
    case "MAX_TOKENS":
      return GEMINI_ERROR_MESSAGES.MAX_TOKENS;
    case "SAFETY":
      return GEMINI_ERROR_MESSAGES.SAFETY;
    case "RECITATION":
      return GEMINI_ERROR_MESSAGES.RECITATION;
    default:
      return GEMINI_ERROR_MESSAGES.UNKNOWN;
  }
}

/**
 * UI 노출 직전에 호출. 친절한 메시지면 그대로, raw 패턴이면 정제된 메시지로 변환.
 *
 * - `Gemini API <status>: <body>` (legacy) → status/body 기반 친절 메시지
 * - 그 외 → 그대로 (이미 friendly 라고 가정)
 */
export function sanitizeGeminiErrorMessage(message: string): string {
  const m = message.match(/^Gemini API (\d+):\s*([\s\S]*)$/);
  if (m) {
    const status = Number(m[1]);
    return geminiMessageForStatus(status, m[2]);
  }
  return message;
}
