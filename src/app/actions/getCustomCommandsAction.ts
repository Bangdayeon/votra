"use server";

import { seedDefaultCommands } from "@/application/seedDefaultCommands";
import type { ProjectCommandRecord } from "@/domain/memory/types";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";

export type { ProjectCommandRecord };

async function resolveCommands(userId: string): Promise<ProjectCommandRecord[]> {
  let commands = await prismaCommandRepository.listByUser(userId);
  if (commands.length === 0) {
    await seedDefaultCommands(userId, { commands: prismaCommandRepository });
    commands = await prismaCommandRepository.listByUser(userId);
  }
  return commands;
}

export async function getCommandsAction(): Promise<ProjectCommandRecord[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요해요.");
  return resolveCommands(user.id);
}
