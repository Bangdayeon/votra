import type { ProjectToolRecord } from "@/domain/memory/types";

// backward-compat alias
export function matchSkillsToTask(
  task: { title: string; tool?: string | null },
  skills: ProjectToolRecord[],
): ProjectToolRecord[] {
  if (!task.tool) return [];
  return skills.filter((s) => s.slug === task.tool);
}
