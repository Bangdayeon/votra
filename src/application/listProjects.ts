import type { FolderNode } from "@/components/FolderTree";
import type { ProjectRepository } from "@/application/ports/projectRepository";

export type ProjectListItem = {
  id: string;
  name: string;
  agent?: string;
  description?: string;
  image?: string;
  structure?: FolderNode[];
  cwd?: string;
};

export async function listProjects(deps: {
  projects: ProjectRepository;
}): Promise<ProjectListItem[]> {
  const rows = await deps.projects.list();
  return rows.map((r) => ({
    id: r.id,
    name: r.title,
    agent: r.firstAgentSource?.toLowerCase(),
    description: r.description ?? undefined,
    image: r.thumbnailUrl ?? undefined,
    structure: extractTree(r.structure),
    cwd: r.cwd ?? undefined,
  }));
}

function extractTree(structure: unknown): FolderNode[] | undefined {
  if (!structure || typeof structure !== "object" || Array.isArray(structure)) {
    return undefined;
  }
  const tree = (structure as { tree?: unknown }).tree;
  return Array.isArray(tree) ? (tree as FolderNode[]) : undefined;
}
