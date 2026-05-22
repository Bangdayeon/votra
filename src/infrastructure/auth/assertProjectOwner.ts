import "server-only";

import { prisma } from "@/infrastructure/db/prisma";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";

export type AssertProjectOwnerResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function assertProjectOwner(
  projectId: string,
): Promise<AssertProjectOwnerResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { role: true },
  });

  if (member?.role !== "OWNER") {
    return { ok: false, error: "소유자만 초대 링크를 만들 수 있어요." };
  }
  return { ok: true, userId: user.id };
}
