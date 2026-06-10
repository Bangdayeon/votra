import type { MemoryContextRepository } from "@/application/ports/memoryContextRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";

export type ContextEngine = {
  learn: (input: {
    tasks: Array<{
      seq: number;
      title: string;
      priority: number;
      keyDecisions: string[];
      outcome: string | null;
    }>;
    previousContext: string | null;
  }) => Promise<{
    updatedContext: string;
    longTermCandidateSeqs: number[];
  }>;
};

const inFlight = new Set<string>();

export async function learnAndUpdateContext(
  projectId: string,
  deps: {
    tasks: TaskRepository;
    context: MemoryContextRepository;
    engine: ContextEngine;
  },
): Promise<void> {
  if (inFlight.has(projectId)) return;
  inFlight.add(projectId);
  try {
    const [doneTasks, longTermTasks, previousContext] = await Promise.all([
      deps.tasks.listByFilter({ projectId, status: "DONE", limit: 50 }),
      deps.tasks.listByMemoryTier({ projectId, tier: "LONG_TERM", limit: 20 }),
      deps.context.findByProject(projectId),
    ]);

    const doneIds = new Set(doneTasks.map((t) => t.id));
    const uniqueLongTerm = longTermTasks.filter((t) => !doneIds.has(t.id));
    const allTasks = [...doneTasks, ...uniqueLongTerm];

    if (allTasks.length === 0) return;

    const { updatedContext, longTermCandidateSeqs } = await deps.engine.learn({
      tasks: allTasks,
      previousContext: previousContext?.content ?? null,
    });

    await deps.context.upsert({ projectId, content: updatedContext });

    if (longTermCandidateSeqs.length > 0) {
      const candidates = allTasks.filter(
        (t) => longTermCandidateSeqs.includes(t.seq) && t.memoryTier !== "LONG_TERM",
      );
      await Promise.all(
        candidates.map((t) => deps.tasks.updateMemoryTier({ taskId: t.id, tier: "LONG_TERM" })),
      );
    }
  } finally {
    inFlight.delete(projectId);
  }
}
