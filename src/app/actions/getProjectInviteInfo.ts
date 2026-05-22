"use server";

import type { ProjectInviteRow } from "@/application/ports/projectInviteRepository";
import { prismaProjectInviteRepository } from "@/infrastructure/repositories/prismaProjectInviteRepository";

export type { ProjectInviteRow };

export async function getProjectInviteInfoAction(
  token: string,
): Promise<ProjectInviteRow | null> {
  return prismaProjectInviteRepository.findByToken(token);
}
