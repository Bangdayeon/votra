import { describe, expect, it, vi } from "vitest";

import type { ProjectRepository } from "@/application/ports/projectRepository";
import { removeMember } from "@/application/removeMember";

function makeProjects(opts: {
  requesterRole?: "OWNER" | "MEMBER" | null;
  targetRole?: "OWNER" | "MEMBER" | null;
  ownerCount?: number;
}): Pick<ProjectRepository, "findMemberRole" | "countOwners" | "removeMember"> {
  return {
    findMemberRole: vi.fn().mockImplementation(({ userId }: { projectId: string; userId: string }) => {
      if (userId === "requester") return Promise.resolve(opts.requesterRole ?? "OWNER");
      if (userId === "target") return Promise.resolve(opts.targetRole ?? "MEMBER");
      return Promise.resolve(null);
    }),
    countOwners: vi.fn().mockResolvedValue(opts.ownerCount ?? 2),
    removeMember: vi.fn().mockResolvedValue(undefined),
  };
}

const BASE = { projectId: "proj-1", requesterId: "requester", targetUserId: "target" };

describe("removeMember", () => {
  it("자신을 강퇴하면 실패한다", async () => {
    const projects = makeProjects({});
    const result = await removeMember(
      { projectId: "proj-1", requesterId: "me", targetUserId: "me" },
      { projects: projects as unknown as ProjectRepository },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("자신을 강퇴할 수 없어요.");
    expect(projects.removeMember).not.toHaveBeenCalled();
  });

  it("OWNER가 아닌 멤버가 강퇴 요청하면 실패한다", async () => {
    const projects = makeProjects({ requesterRole: "MEMBER" });
    const result = await removeMember(BASE, { projects: projects as unknown as ProjectRepository });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("소유자만 멤버를 강퇴할 수 있어요.");
    expect(projects.removeMember).not.toHaveBeenCalled();
  });

  it("마지막 OWNER를 강퇴하면 실패한다", async () => {
    const projects = makeProjects({ targetRole: "OWNER", ownerCount: 1 });
    const result = await removeMember(BASE, { projects: projects as unknown as ProjectRepository });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("마지막 소유자는 강퇴할 수 없어요.");
    expect(projects.removeMember).not.toHaveBeenCalled();
  });

  it("OWNER가 일반 MEMBER를 강퇴하면 성공한다", async () => {
    const projects = makeProjects({ targetRole: "MEMBER" });
    const result = await removeMember(BASE, { projects: projects as unknown as ProjectRepository });

    expect(result.ok).toBe(true);
    expect(projects.removeMember).toHaveBeenCalledWith({ projectId: "proj-1", targetUserId: "target" });
  });

  it("OWNER가 여럿일 때 OWNER도 강퇴할 수 있다", async () => {
    const projects = makeProjects({ targetRole: "OWNER", ownerCount: 2 });
    const result = await removeMember(BASE, { projects: projects as unknown as ProjectRepository });

    expect(result.ok).toBe(true);
    expect(projects.removeMember).toHaveBeenCalledOnce();
  });
});
