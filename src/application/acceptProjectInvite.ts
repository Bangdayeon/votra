import type { ProjectInviteRepository } from "@/application/ports/projectInviteRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";

export type AcceptResult =
  | { ok: true; projectTitle: string; projectId: string }
  | { ok: false; error: "NOT_FOUND" | "EXPIRED" | "ALREADY_ACCEPTED" };

export async function acceptProjectInvite(
  input: { token: string; acceptedById: string },
  deps: { invites: ProjectInviteRepository; projects: ProjectRepository },
): Promise<AcceptResult> {
  const invite = await deps.invites.findByToken(input.token);
  if (!invite) return { ok: false, error: "NOT_FOUND" };
  if (invite.acceptedAt) return { ok: false, error: "ALREADY_ACCEPTED" };
  if (invite.expiresAt < new Date()) return { ok: false, error: "EXPIRED" };

  const result = await deps.invites.accept({
    token: input.token,
    acceptedById: input.acceptedById,
  });

  return { ok: true, projectTitle: result.projectTitle, projectId: result.projectId };
}
