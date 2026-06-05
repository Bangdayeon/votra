import { describe, expect, it, vi } from "vitest";

import type { TaskRepository } from "@/application/ports/taskRepository";
import { updateTask } from "@/application/updateTask";
import type { TaskRecord } from "@/domain/memory/types";

function makeTask(overrides: Partial<TaskRecord> & { seq: number; title: string }): TaskRecord {
  return {
    id: `task-${overrides.seq}`,
    seq: overrides.seq,
    projectId: "proj-1",
    userId: "user-1",
    userName: "테스터",
    userProfileImage: null,
    userProfileColor: null,
    description: null,
    status: "PENDING",
    tool: null,
    priority: 3,
    sortOrder: 0,
    keyDecisions: [],
    outcome: null,
    folderId: null,
    memoryTier: "ACTIVE",
    accessCount: 0,
    lastAccessedAt: null,
    isPinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    doneAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("updateTask", () => {
  it("태스크를 성공적으로 업데이트한다", async () => {
    const updated = makeTask({ seq: 5, title: "수정된 태스크" });
    const tasks = { update: vi.fn().mockResolvedValue(updated) } as unknown as TaskRepository;

    const result = await updateTask({ seq: 5, userId: "user-1", title: "수정된 태스크" }, { tasks });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(updated);
  });

  it("태스크를 찾지 못하면 에러 메시지를 반환한다", async () => {
    const tasks = { update: vi.fn().mockResolvedValue(null) } as unknown as TaskRepository;

    const result = await updateTask({ seq: 99, userId: "user-1" }, { tasks });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("태스크 #99를 찾을 수 없거나 권한이 없어요.");
  });

  it("DB 오류가 발생하면 err를 반환한다", async () => {
    const tasks = {
      update: vi.fn().mockRejectedValue(new Error("타임아웃")),
    } as unknown as TaskRepository;

    const result = await updateTask({ seq: 1, userId: "user-1" }, { tasks });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("타임아웃");
  });
});
