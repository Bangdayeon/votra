import type { ProjectMemberRow, ProjectRepository } from "@/application/ports/projectRepository";

export type { ProjectMemberRow };

export async function getProjectMembers(
  projectId: string,
  deps: { projects: ProjectRepository },
): Promise<ProjectMemberRow[]> {
  return deps.projects.findMembers(projectId);
}
