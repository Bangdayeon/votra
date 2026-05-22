import type { ProjectRepository } from "@/application/ports/projectRepository";

export async function updateMemberRole(
  input: { projectId: string; requesterId: string; targetUserId: string; newRole: "OWNER" | "MEMBER" },
  deps: { projects: ProjectRepository },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.requesterId === input.targetUserId) {
    return { ok: false, error: "자신의 역할은 변경할 수 없어요." };
  }

  const requesterRole = await deps.projects.findMemberRole({
    projectId: input.projectId,
    userId: input.requesterId,
  });
  if (requesterRole !== "OWNER") {
    return { ok: false, error: "소유자만 역할을 변경할 수 있어요." };
  }

  await deps.projects.updateMemberRole({
    projectId: input.projectId,
    targetUserId: input.targetUserId,
    newRole: input.newRole,
  });
  return { ok: true };
}
