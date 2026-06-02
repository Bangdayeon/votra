import type { FolderNode } from "@/shared/folder/types";
import type { ProjectRepository } from "@/application/ports/projectRepository";

export type ProjectListItem = {
  id: string;
  name: string;
  agent?: string;
  description?: string;
  image?: string;
  structure?: FolderNode[];
  cwd?: string;
  isOwner: boolean;
  /** ISO 8601 — CLI 가 마지막으로 세션을 업로드한 시각 */
  lastCliSyncAt?: string;
  sortOrder: number;
  isFavorite: boolean;
};

export async function listProjects(
  args: { userId: string },
  deps: { projects: ProjectRepository },
): Promise<ProjectListItem[]> {
  const rows = await deps.projects.list({ userId: args.userId });
  return rows.map((r) => ({
    id: r.id,
    name: r.title,
    agent: r.firstAgentSource?.toLowerCase(),
    description: r.description ?? undefined,
    image: r.thumbnailUrl ?? undefined,
    structure: extractTree(r.structure),
    cwd: r.cwd ?? undefined,
    isOwner: r.memberRole === "OWNER",
    lastCliSyncAt: r.lastCliSyncAt?.toISOString(),
    sortOrder: r.sortOrder,
    isFavorite: r.isFavorite,
  }));
}

function extractTree(structure: unknown): FolderNode[] | undefined {
  if (!structure || typeof structure !== "object" || Array.isArray(structure)) {
    return undefined;
  }
  const tree = (structure as { tree?: unknown }).tree;
  return Array.isArray(tree) ? (tree as FolderNode[]) : undefined;
}
