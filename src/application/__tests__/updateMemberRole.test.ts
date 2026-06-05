import { describe, expect, it, vi } from "vitest";

import type { ProjectRepository } from "@/application/ports/projectRepository";
import { updateMemberRole } from "@/application/updateMemberRole";

function makeProjects(
  requesterRole: "OWNER" | "MEMBER" | null,
): Pick<ProjectRepository, "findMemberRole" | "updateMemberRole"> {
  return {
    findMemberRole: vi.fn().mockResolvedValue(requesterRole),
    updateMemberRole: vi.fn().mockResolvedValue(undefined),
  };
}

const BASE = { projectId: "proj-1", requesterId: "requester", targetUserId: "target", newRole: "MEMBER" as const };

describe("updateMemberRole", () => {
  it("자신의 역할을 변경하면 실패한다", async () => {
    const projects = makeProjects("OWNER");
    const result = await updateMemberRole(
      { ...BASE, requesterId: "same", targetUserId: "same" },
      { projects: projects as unknown as ProjectRepository },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("자신의 역할은 변경할 수 없어요.");
    expect(projects.updateMemberRole).not.toHaveBeenCalled();
  });

  it("OWNER가 아닌 멤버가 역할을 변경하면 실패한다", async () => {
    const projects = makeProjects("MEMBER");
    const result = await updateMemberRole(BASE, { projects: projects as unknown as ProjectRepository });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("소유자만 역할을 변경할 수 있어요.");
    expect(projects.updateMemberRole).not.toHaveBeenCalled();
  });

  it("OWNER가 다른 멤버의 역할을 OWNER로 승격시킬 수 있다", async () => {
    const projects = makeProjects("OWNER");
    const result = await updateMemberRole(
      { ...BASE, newRole: "OWNER" },
      { projects: projects as unknown as ProjectRepository },
    );

    expect(result.ok).toBe(true);
    expect(projects.updateMemberRole).toHaveBeenCalledWith({
      projectId: "proj-1",
      targetUserId: "target",
      newRole: "OWNER",
    });
  });

  it("OWNER가 다른 멤버의 역할을 MEMBER로 강등시킬 수 있다", async () => {
    const projects = makeProjects("OWNER");
    const result = await updateMemberRole(BASE, { projects: projects as unknown as ProjectRepository });

    expect(result.ok).toBe(true);
    expect(projects.updateMemberRole).toHaveBeenCalledOnce();
  });
});
