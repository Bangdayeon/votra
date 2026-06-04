import type { ProjectCustomSkillRecord } from "@/domain/memory/types";

export function matchSkillsToTask(
  task: { title: string; module?: string | null },
  skills: ProjectCustomSkillRecord[],
): ProjectCustomSkillRecord[] {
  if (!task.module) return [];
  return skills.filter((s) => s.slug === task.module);
}
