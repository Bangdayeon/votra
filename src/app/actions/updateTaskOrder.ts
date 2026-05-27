"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prisma } from "@/infrastructure/db/prisma";

export async function updateTaskOrderAction(
  projectId: string,
  orders: { id: string; sortOrder: number }[],
): Promise<void> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  await prisma.$transaction(
    orders.map(({ id, sortOrder }) =>
      prisma.task.update({ where: { id }, data: { sortOrder } }),
    ),
  );
}
