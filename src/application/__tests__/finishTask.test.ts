import { describe, expect, it, vi } from "vitest";

import type { TaskRepository } from "@/application/ports/taskRepository";
import { finishTask } from "@/application/finishTask";
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
    status: "DONE",
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
    doneAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

const BASE_INPUT = { seq: 3, userId: "user-1", projectId: "proj-1", summary: "완료 요약", aiTool: "claude" };

describe("finishTask", () => {
  it("status를 DONE으로 설정하고 태스크를 반환한다", async () => {
    const done = makeTask({ seq: 3, title: "완료 태스크" });
    const tasks = { update: vi.fn().mockResolvedValue(done) } as unknown as TaskRepository;

    const result = await finishTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.task).toBe(done);

    const call = vi.mocked(tasks.update).mock.calls[0][0];
    expect(call.status).toBe("DONE");
  });

  it("keyDecisions와 outcome을 제공하면 update에 포함된다", async () => {
    const done = makeTask({ seq: 3, title: "결정 포함 태스크", keyDecisions: ["결정1"], outcome: "결과물" });
    const tasks = { update: vi.fn().mockResolvedValue(done) } as unknown as TaskRepository;

    await finishTask({ ...BASE_INPUT, keyDecisions: ["결정1"], outcome: "결과물" }, { tasks });

    const call = vi.mocked(tasks.update).mock.calls[0][0];
    expect(call.keyDecisions).toEqual(["결정1"]);
    expect(call.outcome).toBe("결과물");
  });

  it("keyDecisions와 outcome을 제공하지 않으면 update에 포함되지 않는다", async () => {
    const done = makeTask({ seq: 3, title: "기본 태스크" });
    const tasks = { update: vi.fn().mockResolvedValue(done) } as unknown as TaskRepository;

    await finishTask(BASE_INPUT, { tasks });

    const call = vi.mocked(tasks.update).mock.calls[0][0];
    expect("keyDecisions" in call).toBe(false);
    expect("outcome" in call).toBe(false);
  });

  it("태스크를 찾지 못하면 에러 메시지를 반환한다", async () => {
    const tasks = { update: vi.fn().mockResolvedValue(null) } as unknown as TaskRepository;

    const result = await finishTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("태스크 #3를 찾을 수 없거나 권한이 없어요.");
  });

  it("DB 오류가 발생하면 err를 반환한다", async () => {
    const tasks = {
      update: vi.fn().mockRejectedValue(new Error("DB 오류")),
    } as unknown as TaskRepository;

    const result = await finishTask(BASE_INPUT, { tasks });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("DB 오류");
  });
});
