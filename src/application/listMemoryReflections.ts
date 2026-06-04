import type { MemoryReflectionRepository } from "@/application/ports/memoryReflectionRepository";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";

export async function listMemoryReflections(
  projectId: string,
  limit: number,
  deps: { reflections: MemoryReflectionRepository },
): Promise<MemoryReflectionRecord[]> {
  return deps.reflections.listByProject({ projectId, limit });
}
