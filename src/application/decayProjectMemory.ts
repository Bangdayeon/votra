import type { TaskRepository } from "@/application/ports/taskRepository";
import { computeMemoryTier } from "@/domain/memory/computeMemoryTier";
import type { MemoryDecaySettings } from "@/domain/memory/memoryTierTypes";
import type { MemoryTierValue } from "@/domain/memory/types";

export type DecayStats = {
  total: number;
  promoted: number;
  archived: number;
  trashed: number;
  unchanged: number;
};

export async function decayProjectMemory(
  projectId: string,
  settings: MemoryDecaySettings,
  deps: { tasks: TaskRepository },
  now: Date = new Date(),
): Promise<DecayStats> {
  const candidates = await deps.tasks.listForDecay(projectId);

  const updates: Array<{ id: string; tier: MemoryTierValue }> = [];
  let promoted = 0;
  let archived = 0;
  let trashed = 0;

  for (const task of candidates) {
    const newTier = computeMemoryTier(task, settings, now);
    if (newTier === task.memoryTier) continue;

    updates.push({ id: task.id, tier: newTier });

    if (newTier === "LONG_TERM") promoted++;
    else if (newTier === "ARCHIVED") archived++;
    else if (newTier === "TRASH") trashed++;
  }

  if (updates.length > 0) {
    await deps.tasks.batchUpdateMemoryTier(updates);
  }

  return {
    total: candidates.length,
    promoted,
    archived,
    trashed,
    unchanged: candidates.length - updates.length,
  };
}
