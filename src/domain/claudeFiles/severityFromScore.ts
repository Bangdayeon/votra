import type { ClaudeFileSeverity } from "@/domain/claudeFiles/types";

/** 휴리스틱 점수(0–100)를 🔴/⚠️/✅ 단계로 매핑.
 *  - ≥70: ✅ 통과
 *  - 40–69: ⚠️ 부분 충족
 *  - <40: 🔴 미달
 */
export function severityFromScore(total: number): ClaudeFileSeverity {
  if (total >= 70) return "OK";
  if (total >= 40) return "WARNING";
  return "DANGER";
}
