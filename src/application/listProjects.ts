import "server-only";

import type { FolderNode } from "@/components/FolderTree";
import { prisma } from "@/infrastructure/db/prisma";

export type ProjectListItem = {
  id: string;
  name: string;
  agent?: string;
  description?: string;
  image?: string;
  structure?: FolderNode[];
};

export async function listProjects(): Promise<ProjectListItem[]> {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { agents: { take: 1 } },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.title,
    agent: p.agents[0]?.source.toLowerCase(),
    description: p.description ?? undefined,
    image: p.thumbnailUrl ?? undefined,
    structure: extractTree(p.structure),
  }));
}

function extractTree(structure: unknown): FolderNode[] | undefined {
  if (!structure || typeof structure !== "object" || Array.isArray(structure)) {
    return undefined;
  }
  const tree = (structure as { tree?: unknown }).tree;
  return Array.isArray(tree) ? (tree as FolderNode[]) : undefined;
}
