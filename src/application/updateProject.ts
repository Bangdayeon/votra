import type {
  ProjectRepository,
  ProjectUpdateInput,
} from "@/application/ports/projectRepository";

export type UpdateProjectInput = ProjectUpdateInput;

export async function updateProject(
  input: UpdateProjectInput,
  deps: { projects: ProjectRepository },
): Promise<void> {
  await deps.projects.update(input);
}
