"use server";

import { acceptProjectInvite, type AcceptResult } from "@/application/acceptProjectInvite";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaProjectInviteRepository } from "@/infrastructure/repositories/prismaProjectInviteRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export type { AcceptResult };

export async function acceptProjectInviteAction(token: string): Promise<AcceptResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "NOT_FOUND" };

  const result = await acceptProjectInvite(
    { token, acceptedById: user.id },
    { invites: prismaProjectInviteRepository, projects: prismaProjectRepository },
  );

  if (result.ok) {
    emitProjectUpdate(result.projectId);
  }

  return result;
}
