import type { ClaudeFileGrade } from "@/domain/claudeFiles/types";

export function gradeFromScore(total: number): ClaudeFileGrade {
  if (total >= 90) return "A";
  if (total >= 70) return "B";
  if (total >= 50) return "C";
  if (total >= 30) return "D";
  return "F";
}
