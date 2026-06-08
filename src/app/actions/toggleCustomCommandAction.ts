"use server";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

export async function toggleToolAction(
  id: string,
  isEnabled: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요해요.");
  await prismaToolRepository.setEnabled(id, isEnabled);
}
