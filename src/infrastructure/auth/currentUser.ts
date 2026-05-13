import "server-only";

import { prisma } from "@/infrastructure/db/prisma";

import { readSessionFromCookies } from "./session";

export async function getCurrentUser() {
  const session = await readSessionFromCookies();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, axhubUserId: true },
  });
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
