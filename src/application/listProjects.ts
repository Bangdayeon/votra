import "server-only";

import { prisma } from "@/infrastructure/db/prisma";

export type ProjectListItem = {
  id: string;
  name: string;
  agent?: string;
  description?: string;
  image?: string;
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
  }));
}
