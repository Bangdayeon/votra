import type { ProjectRepository } from "@/application/ports/projectRepository";
import { ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function reorderProjects(
  args: { userId: string; orderedIds: string[] },
  deps: { projects: ProjectRepository },
): Promise<Result<void, string>> {
  if (args.orderedIds.length === 0) return ok(undefined);
  await deps.projects.reorderProjects(args);
  return ok(undefined);
}
