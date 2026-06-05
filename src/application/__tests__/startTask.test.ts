import { describe, expect, it, vi } from "vitest";

import type { TaskRepository } from "@/application/ports/taskRepository";
import { startTask } from "@/application/startTask";
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

const BASE_INPUT = { title: "즉시 시작 태스크", projectId: "proj-1", userId: "user-1" };

describe("startTask", () => {
  it("태스크를 생성한 뒤 즉시 IN_PROGRESS로 업데이트한다", async () => {
    const created = makeTask({ seq: 7, title: "즉시 시작 태스크" });
    const started = makeTask({ seq: 7, title: "즉시 시작 태스크", status: "IN_PROGRESS" });
    const tasks = {
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn().mockResolvedValue(started),
    } as unknown as TaskRepository;

    const result = await startTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe("IN_PROGRESS");

    expect(tasks.create).toHaveBeenCalledWith(BASE_INPUT);
    expect(vi.mocked(tasks.update).mock.calls[0][0]).toMatchObject({
      seq: 7,
      userId: "user-1",
      status: "IN_PROGRESS",
    });
  });

  it("update가 null을 반환하면 err를 반환한다", async () => {
    const created = makeTask({ seq: 8, title: "태스크" });
    const tasks = {
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn().mockResolvedValue(null),
    } as unknown as TaskRepository;

    const result = await startTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("태스크 #8 상태 변경에 실패했어요.");
  });

  it("create가 실패하면 err를 반환한다", async () => {
    const tasks = {
      create: vi.fn().mockRejectedValue(new Error("생성 실패")),
      update: vi.fn(),
    } as unknown as TaskRepository;

    const result = await startTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("생성 실패");
    expect(tasks.update).not.toHaveBeenCalled();
  });
});
