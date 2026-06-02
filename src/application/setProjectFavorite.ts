import type { ProjectRepository } from "@/application/ports/projectRepository";
import { ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function setProjectFavorite(
  args: { userId: string; id: string; isFavorite: boolean },
  deps: { projects: ProjectRepository },
): Promise<Result<void, string>> {
  await deps.projects.setFavorite(args);
  return ok(undefined);
}
