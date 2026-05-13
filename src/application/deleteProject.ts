import "server-only";

import { prisma } from "@/infrastructure/db/prisma";

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } });
}
