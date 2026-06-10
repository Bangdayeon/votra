import { describe, expect, it, vi } from "vitest";

import type { TaskRepository, DecayCandidate } from "@/application/ports/taskRepository";
import { decayProjectMemory } from "@/application/decayProjectMemory";
import { DEFAULT_MEMORY_SETTINGS } from "@/domain/memory/memoryTierTypes";

function makeCandidate(overrides: Partial<DecayCandidate> & { id: string }): DecayCandidate {
  return {
    id: overrides.id,
    isPinned: false,
    accessCount: 0,
    priority: 0,
    lastAccessedAt: null,
    doneAt: null,
    createdAt: new Date(),
    deletedAt: null,
    memoryTier: "ACTIVE",
    ...overrides,
  };
}

const settings = DEFAULT_MEMORY_SETTINGS;

describe("decayProjectMemory", () => {
  it("후보 태스크가 없으면 batchUpdateMemoryTier를 호출하지 않는다", async () => {
    const tasks = {
      listForDecay: vi.fn().mockResolvedValue([]),
      batchUpdateMemoryTier: vi.fn(),
    } as unknown as TaskRepository;

    const stats = await decayProjectMemory("proj-1", settings, { tasks });

    expect(stats.total).toBe(0);
    expect(stats.unchanged).toBe(0);
    expect(tasks.batchUpdateMemoryTier).not.toHaveBeenCalled();
  });

  it("계층이 바뀌지 않는 태스크는 업데이트하지 않는다", async () => {
    const recent = makeCandidate({ id: "t1", createdAt: new Date(), memoryTier: "ACTIVE" });
    const tasks = {
      listForDecay: vi.fn().mockResolvedValue([recent]),
      batchUpdateMemoryTier: vi.fn(),
    } as unknown as TaskRepository;

    const stats = await decayProjectMemory("proj-1", settings, { tasks }, new Date());

    expect(stats.unchanged).toBe(1);
    expect(tasks.batchUpdateMemoryTier).not.toHaveBeenCalled();
  });

  it("오래된 태스크는 ARCHIVED로 이동하고 stats에 반영된다", async () => {
    const old = makeCandidate({
      id: "t2",
      createdAt: new Date(0),
      doneAt: new Date(0),
      memoryTier: "ACTIVE",
    });
    const tasks = {
      listForDecay: vi.fn().mockResolvedValue([old]),
      batchUpdateMemoryTier: vi.fn(),
    } as unknown as TaskRepository;

    const stats = await decayProjectMemory("proj-1", settings, { tasks }, new Date());

    expect(stats.archived + stats.trashed).toBeGreaterThan(0);
    expect(tasks.batchUpdateMemoryTier).toHaveBeenCalledOnce();
  });

  it("deletedAt이 있는 태스크는 TRASH로 이동한다", async () => {
    const deleted = makeCandidate({ id: "t3", deletedAt: new Date(), memoryTier: "ACTIVE" });
    const tasks = {
      listForDecay: vi.fn().mockResolvedValue([deleted]),
      batchUpdateMemoryTier: vi.fn(),
    } as unknown as TaskRepository;

    const stats = await decayProjectMemory("proj-1", settings, { tasks }, new Date());

    expect(stats.trashed).toBe(1);
    const [updates] = vi.mocked(tasks.batchUpdateMemoryTier).mock.calls[0];
    expect(updates[0]).toEqual({ id: "t3", tier: "TRASH" });
  });

  it("isPinned 태스크는 LONG_TERM으로 승격된다", async () => {
    const pinned = makeCandidate({ id: "t4", isPinned: true, memoryTier: "ACTIVE" });
    const tasks = {
      listForDecay: vi.fn().mockResolvedValue([pinned]),
      batchUpdateMemoryTier: vi.fn(),
    } as unknown as TaskRepository;

    const stats = await decayProjectMemory("proj-1", settings, { tasks }, new Date());

    expect(stats.promoted).toBe(1);
  });

  it("total, promoted, archived, trashed, unchanged 합계가 맞다", async () => {
    const recent = makeCandidate({ id: "a", createdAt: new Date(), memoryTier: "ACTIVE" });
    const deleted = makeCandidate({ id: "b", deletedAt: new Date(), memoryTier: "ACTIVE" });
    const pinned = makeCandidate({ id: "c", isPinned: true, memoryTier: "ACTIVE" });

    const tasks = {
      listForDecay: vi.fn().mockResolvedValue([recent, deleted, pinned]),
      batchUpdateMemoryTier: vi.fn(),
    } as unknown as TaskRepository;

    const stats = await decayProjectMemory("proj-1", settings, { tasks }, new Date());

    expect(stats.total).toBe(3);
    expect(stats.unchanged + stats.promoted + stats.archived + stats.trashed).toBe(3);
  });
});
