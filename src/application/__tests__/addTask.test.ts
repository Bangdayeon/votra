import { describe, expect, it, vi } from "vitest";

import type { TaskRepository } from "@/application/ports/taskRepository";
import { addTask } from "@/application/addTask";
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

const BASE_INPUT = { title: "새 태스크", projectId: "proj-1", userId: "user-1" };

describe("addTask", () => {
  it("태스크를 성공적으로 생성한다", async () => {
    const created = makeTask({ seq: 1, title: "새 태스크" });
    const tasks = { create: vi.fn().mockResolvedValue(created) } as unknown as TaskRepository;

    const result = await addTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(created);
    expect(tasks.create).toHaveBeenCalledWith(BASE_INPUT);
  });

  it("DB 오류가 발생하면 err를 반환한다", async () => {
    const tasks = {
      create: vi.fn().mockRejectedValue(new Error("DB 연결 실패")),
    } as unknown as TaskRepository;

    const result = await addTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("DB 연결 실패");
  });

  it("DB가 Error 외 값을 throw하면 기본 메시지를 반환한다", async () => {
    const tasks = { create: vi.fn().mockRejectedValue("unknown") } as unknown as TaskRepository;

    const result = await addTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("태스크 생성에 실패했어요.");
  });
});
