import type { ProjectInviteRepository } from "@/application/ports/projectInviteRepository";

const INVITE_TTL_MS = 24 * 60 * 60 * 1000; // 1일

export type CreateProjectInviteInput = {
  projectId: string;
  invitedById: string;
  email: string | null;
};

export async function createProjectInvite(
  input: CreateProjectInviteInput,
  deps: { invites: ProjectInviteRepository },
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await deps.invites.create({
    token,
    email: input.email,
    projectId: input.projectId,
    invitedById: input.invitedById,
    expiresAt,
  });
  return token;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
