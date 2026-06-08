"use server";

import { listCommands } from "@/application/listCommands";
import type { ProjectCommandRecord } from "@/domain/memory/types";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";

export type { ProjectCommandRecord };

export async function getCommandsAction(): Promise<ProjectCommandRecord[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요해요.");
  const result = await listCommands(user.id, { commands: prismaCommandRepository });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
