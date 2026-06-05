import type { ProjectToolRecord } from "@/domain/memory/types";

export function matchToolsToTask(
  task: { title: string; tool?: string | null },
  tools: ProjectToolRecord[],
): ProjectToolRecord[] {
  if (!task.tool) return [];
  return tools.filter((t) => t.slug === task.tool);
}
