import type { PolicyRule } from "@/domain/policy/types";

/** PolicyRule rows 를 "AI 스펙 문서 지침" textarea 의 기본 본문으로 렌더링.
 *  사용자가 별도로 수정하지 않았다면 이 텍스트가 DB 의 aiSpecGuideline 으로 저장돼요.
 */
export function buildDefaultGuideline(rules: PolicyRule[]): string {
  const ordered = [...rules].sort((a, b) => a.displayOrder - b.displayOrder);
  const lines: string[] = [
    "# AI 정책 평가 기준",
    "",
    "다음 항목을 기준으로 md 파일(CLAUDE.md, AGENTS.md 등)을 평가해 주세요.",
    "",
  ];
  for (const r of ordered) {
    lines.push(`## ${r.label} (만점 ${r.maxPoints})`);
    lines.push(r.description);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}
