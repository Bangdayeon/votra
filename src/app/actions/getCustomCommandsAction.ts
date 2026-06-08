"use server";

import { listCommands } from "@/application/listCommands";
import type { ProjectCommandRecord } from "@/domain/memory/types";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";

export type { ProjectCommandRecord };

export async function getCommandsAction(projectId: string): Promise<ProjectCommandRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);
  const result = await listCommands(projectId, { commands: prismaCommandRepository });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
