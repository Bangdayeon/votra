"use server";

import { headers } from "next/headers";

import { createProjectInvite } from "@/application/createProjectInvite";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaProjectInviteRepository } from "@/infrastructure/repositories/prismaProjectInviteRepository";

export async function createProjectInviteAction(
  projectId: string,
  email: string | null,
): Promise<{ inviteUrl: string }> {
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const token = await createProjectInvite(
    { projectId, invitedById: guard.userId, email },
    { invites: prismaProjectInviteRepository },
  );

  const origin = await getOrigin();
  return { inviteUrl: `${origin}/invite/${token}` };
}

async function getOrigin(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
