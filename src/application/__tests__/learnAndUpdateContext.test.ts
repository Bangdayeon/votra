import { describe, expect, it, vi } from "vitest";

import type { MemoryContextRepository } from "@/application/ports/memoryContextRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import type { ContextEngine } from "@/application/learnAndUpdateContext";
import { learnAndUpdateContext } from "@/application/learnAndUpdateContext";
import type { TaskRecord } from "@/domain/memory/types";

function makeTask(seq: number, overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: `task-${seq}`,
    seq,
    projectId: "proj-1",
    userId: "user-1",
    userName: "테스터",
    userProfileImage: null,
    userProfileColor: null,
    title: `태스크 ${seq}`,
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
  longTermTasks?: TaskRecord[];
  previousContent?: string | null;
  engineResult?: { updatedContext: string; longTermCandidateSeqs: number[] };
}) {
  const tasks = {
    listByFilter: vi.fn().mockResolvedValue(overrides.doneTasks ?? [makeTask(1)]),
    listByMemoryTier: vi.fn().mockResolvedValue(overrides.longTermTasks ?? []),
    updateMemoryTier: vi.fn().mockResolvedValue(undefined),
  } as unknown as TaskRepository;

  const context: MemoryContextRepository = {
    findByProject: vi.fn().mockResolvedValue(
      overrides.previousContent !== undefined
        ? { id: "ctx-1", projectId: "proj-1", content: overrides.previousContent ?? "", version: 1, updatedAt: new Date(), serviceDescription: null, techStack: null, targetUsers: null, currentGoal: null }
        : null,
    ),
    upsert: vi.fn().mockResolvedValue({ id: "ctx-1", projectId: "proj-1", content: "", version: 1, updatedAt: new Date(), serviceDescription: null, techStack: null, targetUsers: null, currentGoal: null }),
  };

  const engine: ContextEngine = {
    learn: vi.fn().mockResolvedValue(
      overrides.engineResult ?? { updatedContext: "새 컨텍스트", longTermCandidateSeqs: [] },
    ),
  };

  return { tasks, context, engine };
}

describe("learnAndUpdateContext", () => {
  it("완료 태스크가 있으면 engine.learn을 호출하고 context를 업데이트한다", async () => {
    const deps = makeDeps({});

    await learnAndUpdateContext("proj-learn-1", deps);

    expect(deps.engine.learn).toHaveBeenCalledOnce();
    expect(deps.context.upsert).toHaveBeenCalledWith({ projectId: "proj-learn-1", content: "새 컨텍스트" });
  });

  it("태스크가 전혀 없으면 engine.learn을 호출하지 않는다", async () => {
    const deps = makeDeps({ doneTasks: [], longTermTasks: [] });

    await learnAndUpdateContext("proj-learn-2", deps);

    expect(deps.engine.learn).not.toHaveBeenCalled();
    expect(deps.context.upsert).not.toHaveBeenCalled();
  });

  it("이전 컨텍스트를 engine.learn에 전달한다", async () => {
    const deps = makeDeps({ previousContent: "이전 맥락" });

    await learnAndUpdateContext("proj-learn-3", deps);

    const call = vi.mocked(deps.engine.learn).mock.calls[0][0];
    expect(call.previousContext).toBe("이전 맥락");
  });

  it("이전 컨텍스트가 없으면 null을 전달한다", async () => {
    const deps = makeDeps({ previousContent: undefined });

    await learnAndUpdateContext("proj-learn-4", deps);

    const call = vi.mocked(deps.engine.learn).mock.calls[0][0];
    expect(call.previousContext).toBeNull();
  });

  it("longTermCandidateSeqs가 있으면 해당 태스크를 LONG_TERM으로 승격한다", async () => {
    const t5 = makeTask(5, { memoryTier: "ACTIVE" });
    const deps = makeDeps({
      doneTasks: [t5],
      engineResult: { updatedContext: "컨텍스트", longTermCandidateSeqs: [5] },
    });

    await learnAndUpdateContext("proj-learn-5", deps);

    expect(deps.tasks.updateMemoryTier).toHaveBeenCalledWith({ taskId: "task-5", tier: "LONG_TERM" });
  });

  it("이미 LONG_TERM인 태스크는 다시 승격하지 않는다", async () => {
    const t6 = makeTask(6, { memoryTier: "LONG_TERM" });
    const deps = makeDeps({
      doneTasks: [t6],
      engineResult: { updatedContext: "컨텍스트", longTermCandidateSeqs: [6] },
    });

    await learnAndUpdateContext("proj-learn-6", deps);

    expect(deps.tasks.updateMemoryTier).not.toHaveBeenCalled();
  });

  it("동일 projectId 동시 호출은 engine.learn을 한 번만 실행한다", async () => {
    let resolveEngine!: (v: { updatedContext: string; longTermCandidateSeqs: number[] }) => void;
    const blocker = new Promise<{ updatedContext: string; longTermCandidateSeqs: number[] }>(
      (resolve) => { resolveEngine = resolve; },
    );

    const deps = makeDeps({});
    vi.mocked(deps.engine.learn).mockReturnValue(blocker);

    const p1 = learnAndUpdateContext("proj-concurrent-dedup", deps);
    const p2 = learnAndUpdateContext("proj-concurrent-dedup", deps);

    resolveEngine({ updatedContext: "ctx", longTermCandidateSeqs: [] });
    await Promise.all([p1, p2]);

    expect(deps.engine.learn).toHaveBeenCalledOnce();
  });

  it("LONG_TERM 태스크는 doneTasks와 중복되지 않게 합산한다", async () => {
    const shared = makeTask(7, { memoryTier: "LONG_TERM" });
    const longTermOnly = makeTask(8, { memoryTier: "LONG_TERM" });

    const deps = makeDeps({ doneTasks: [shared], longTermTasks: [shared, longTermOnly] });

    await learnAndUpdateContext("proj-learn-7", deps);

    const call = vi.mocked(deps.engine.learn).mock.calls[0][0];
    expect(call.tasks).toHaveLength(2);
    expect(call.tasks.map((t: { seq: number }) => t.seq)).toContain(7);
    expect(call.tasks.map((t: { seq: number }) => t.seq)).toContain(8);
  });
});
