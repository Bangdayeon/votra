import type { ProjectRepository } from "@/application/ports/projectRepository";

export async function deleteProject(
  id: string,
  deps: { projects: ProjectRepository },
): Promise<void> {
  await deps.projects.delete(id);
}
