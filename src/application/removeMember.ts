import type { ProjectRepository } from "@/application/ports/projectRepository";

export async function removeMember(
  input: { projectId: string; requesterId: string; targetUserId: string },
  deps: { projects: ProjectRepository },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.requesterId === input.targetUserId) {
    return { ok: false, error: "자신을 강퇴할 수 없어요." };
  }

  const requesterRole = await deps.projects.findMemberRole({
    projectId: input.projectId,
    userId: input.requesterId,
  });
  if (requesterRole !== "OWNER") {
    return { ok: false, error: "소유자만 멤버를 강퇴할 수 있어요." };
  }

  const ownerCount = await deps.projects.countOwners(input.projectId);
  const targetRole = await deps.projects.findMemberRole({
    projectId: input.projectId,
    userId: input.targetUserId,
  });
  if (targetRole === "OWNER" && ownerCount <= 1) {
    return { ok: false, error: "마지막 소유자는 강퇴할 수 없어요." };
  }

  await deps.projects.removeMember({
    projectId: input.projectId,
    targetUserId: input.targetUserId,
  });
  return { ok: true };
}
