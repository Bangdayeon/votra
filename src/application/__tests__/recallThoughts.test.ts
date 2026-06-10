import { describe, expect, it, vi } from "vitest";

import type { EmbeddingClient } from "@/application/ports/embeddingClient";
import type { TaskRepository } from "@/application/ports/taskRepository";
import { recallThoughts } from "@/application/recallThoughts";
import type { TaskRecord } from "@/domain/memory/types";

function makeTask(id: string, title: string): TaskRecord {
  return {
    id,
    seq: parseInt(id.replace("t", ""), 10),
    projectId: "proj-1",
    userId: "user-1",
    userName: "테스터",
    userProfileImage: null,
    userProfileColor: null,
    title,
    description: null,
    status: "DONE",
    tool: null,
    priority: 0,
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
  };
}

const INPUT = { query: "인증 버그", projectId: "proj-1", userId: "user-1" };
const DUMMY_EMBEDDING = [0.1, 0.2, 0.3];

function makeDeps(overrides: {
  vectorHits?: TaskRecord[];
  keywordHits?: TaskRecord[];
  vectorError?: Error;
  keywordError?: Error;
}) {
  const embedding: EmbeddingClient = {
    embed: overrides.vectorError
      ? vi.fn().mockRejectedValue(overrides.vectorError)
      : vi.fn().mockResolvedValue(DUMMY_EMBEDDING),
  };
  const tasks = {
    searchByVector: overrides.vectorError
      ? vi.fn().mockRejectedValue(overrides.vectorError)
      : vi.fn().mockResolvedValue(overrides.vectorHits ?? []),
    search: overrides.keywordError
      ? vi.fn().mockRejectedValue(overrides.keywordError)
      : vi.fn().mockResolvedValue(overrides.keywordHits ?? []),
  } as unknown as TaskRepository;
  return { tasks, embedding };
}

describe("recallThoughts", () => {
  it("벡터와 키워드 결과가 없으면 빈 배열을 반환한다", async () => {
    const deps = makeDeps({ vectorHits: [], keywordHits: [] });
    const result = await recallThoughts(INPUT, deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it("벡터 전용 결과를 올바르게 반환한다", async () => {
    const t1 = makeTask("t1", "JWT 검증 로직");
    const deps = makeDeps({ vectorHits: [t1], keywordHits: [] });

    const result = await recallThoughts(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].id).toBe("t1");
  });

  it("키워드 전용 결과를 올바르게 반환한다", async () => {
    const t2 = makeTask("t2", "세션 만료 처리");
    const deps = makeDeps({ vectorHits: [], keywordHits: [t2] });

    const result = await recallThoughts(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].id).toBe("t2");
  });

  it("RRF — 두 결과 모두 등장한 태스크가 더 높은 점수를 얻는다", async () => {
    const shared = makeTask("t10", "공통 태스크");
    const vectorOnly = makeTask("t11", "벡터 전용");

    const deps = makeDeps({
      vectorHits: [shared, vectorOnly],
      keywordHits: [shared],
    });

    const result = await recallThoughts(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].id).toBe("t10");
    }
  });

  it("벡터 검색이 실패해도 키워드 결과는 반환한다", async () => {
    const t3 = makeTask("t3", "오류 처리");
    const deps = makeDeps({
      keywordHits: [t3],
      vectorError: new Error("Gemini 오류"),
    });

    const result = await recallThoughts(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].id).toBe("t3");
  });

  it("키워드 검색이 실패해도 벡터 결과는 반환한다", async () => {
    const t4 = makeTask("t4", "임베딩 태스크");
    const deps = makeDeps({
      vectorHits: [t4],
      keywordError: new Error("DB 오류"),
    });

    const result = await recallThoughts(INPUT, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value[0].id).toBe("t4");
  });

  it("limit을 넘지 않는 결과를 반환한다", async () => {
    const hits = Array.from({ length: 20 }, (_, i) => makeTask(`t${i + 100}`, `태스크 ${i}`));
    const deps = makeDeps({ vectorHits: hits });

    const result = await recallThoughts({ ...INPUT, limit: 5 }, deps);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.length).toBeLessThanOrEqual(5);
  });
});
