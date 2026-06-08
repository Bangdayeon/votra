"use server";

import { createCommand } from "@/application/createCommand";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";
import type { ProjectCommandRecord } from "@/domain/memory/types";
import type { Result } from "@/shared/lib/result";

export async function createCommandAction(
  input: { name: string; description: string; folder: string; content: string },
): Promise<Result<ProjectCommandRecord, string>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  return createCommand(
    { userId: user.id, ...input },
    { commands: prismaCommandRepository },
  );
}
