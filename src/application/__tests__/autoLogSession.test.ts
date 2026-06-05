import { describe, expect, it, vi } from "vitest";

import type { SessionEngine } from "@/application/createSessionLog";
import type { SessionLogRepository } from "@/application/ports/sessionLogRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
import { autoLogSession } from "@/application/autoLogSession";

function makeTask(overrides: Partial<TaskRecord> & { seq: number; title: string }): TaskRecord {
  return {
    id: `task-${overrides.seq}`,
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

function makeDeps(overrides: {
  doneTasks?: TaskRecord[];
  inProgressTasks?: TaskRecord[];
  engineStructure?: (s: string) => Promise<string>;
}) {
  const tasks: Pick<TaskRepository, "findRecentDone" | "listByFilter"> = {
    findRecentDone: vi.fn().mockResolvedValue(overrides.doneTasks ?? []),
    listByFilter: vi.fn().mockResolvedValue(overrides.inProgressTasks ?? []),
  };
  const sessionLogs: Pick<SessionLogRepository, "upsertOrCreate"> = {
    upsertOrCreate: vi.fn().mockResolvedValue(undefined),
  };
  const engine: SessionEngine = {
    structure: overrides.engineStructure ?? vi.fn().mockImplementation((s) => Promise.resolve(s)),
  };
  return { tasks: tasks as unknown as TaskRepository, sessionLogs: sessionLogs as unknown as SessionLogRepository, engine };
}

describe("autoLogSession", () => {
  it("완료 태스크와 진행 중 태스크가 있으면 세션 로그를 생성한다", async () => {
    const deps = makeDeps({
      doneTasks: [makeTask({ seq: 42, title: "keyDecisions 자동 추출" })],
      inProgressTasks: [makeTask({ seq: 43, title: "Stop 훅 추가", status: "IN_PROGRESS", doneAt: null })],
    });

    const result = await autoLogSession(
      { projectId: "proj-1", userId: "user-1" },
      deps,
    );

    expect(result.logged).toBe(true);
    expect(deps.sessionLogs.upsertOrCreate).toHaveBeenCalledOnce();
    const call = vi.mocked(deps.sessionLogs.upsertOrCreate).mock.calls[0][0];
    expect(call.projectId).toBe("proj-1");
    expect(call.aiTool).toBe("claude");
  });

  it("완료 태스크도 진행 중 태스크도 없으면 로그를 생성하지 않는다", async () => {
    const deps = makeDeps({ doneTasks: [], inProgressTasks: [] });

    const result = await autoLogSession(
      { projectId: "proj-1", userId: "user-1" },
      deps,
    );

    expect(result.logged).toBe(false);
    expect(deps.sessionLogs.upsertOrCreate).not.toHaveBeenCalled();
  });

  it("진행 중 태스크만 있어도 세션 로그를 생성한다", async () => {
    const deps = makeDeps({
      doneTasks: [],
      inProgressTasks: [makeTask({ seq: 10, title: "UI 리팩토링", status: "IN_PROGRESS", doneAt: null })],
    });

    const result = await autoLogSession(
      { projectId: "proj-1", userId: "user-1" },
      deps,
    );

    expect(result.logged).toBe(true);
  });

  it("sessionId를 전달하면 세션 로그에 포함된다", async () => {
    const deps = makeDeps({
      doneTasks: [makeTask({ seq: 1, title: "완료 작업" })],
    });

    await autoLogSession(
      { projectId: "proj-1", userId: "user-1", sessionId: "session-abc" },
      deps,
    );

    const call = vi.mocked(deps.sessionLogs.upsertOrCreate).mock.calls[0][0];
    expect(call.sessionId).toBe("session-abc");
  });
});
