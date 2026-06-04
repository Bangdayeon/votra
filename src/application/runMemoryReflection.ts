import type { MemoryReflectionRepository } from "@/application/ports/memoryReflectionRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import type { MemoryReflectionRecord, ReflectionInsight, ReflectionSuggestedTask, SkillSuggestion } from "@/domain/memory/memoryTierTypes";

export type ReflectionInput = {
  tasks: Array<{ seq: number; title: string; priority: number; keyDecisions: string[]; outcome: string | null }>;
  activeTasks: Array<{ seq: number; title: string }>;
  previousContextSummary: string | null;
};

export type ReflectionOutput = {
  insights: ReflectionInsight[];
  suggestedTasks: ReflectionSuggestedTask[];
  skillSuggestions: SkillSuggestion[];
  contextSummary: string | null;
};

export type ReflectionEngine = {
  analyze: (input: ReflectionInput) => Promise<ReflectionOutput>;
};

export async function runMemoryReflection(
  projectId: string,
  triggerReason: "cron" | "threshold",
  deps: {
    tasks: TaskRepository;
    reflections: MemoryReflectionRepository;
    engine: ReflectionEngine;
  },
): Promise<MemoryReflectionRecord> {
  const [doneTasks, longTermTasks, activeTasks, latest] = await Promise.all([
    deps.tasks.listByFilter({ projectId, status: "DONE", limit: 50 }),
    deps.tasks.listByMemoryTier({ projectId, tier: "LONG_TERM", limit: 20 }),
    deps.tasks.listByFilter({ projectId, limit: 20 }),
    deps.reflections.getLatest(projectId),
  ]);

  // 중복 제거: LONG_TERM 중 DONE 상태인 것은 doneTasks에 이미 포함될 수 있음
  const doneIds = new Set(doneTasks.map((t) => t.id));
  const uniqueLongTerm = longTermTasks.filter((t) => !doneIds.has(t.id));
  const allReferenceTasks = [...doneTasks, ...uniqueLongTerm];

  const activeNonDone = activeTasks.filter(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
  );

  const output = await deps.engine.analyze({
    tasks: allReferenceTasks,
    activeTasks: activeNonDone.map((t) => ({ seq: t.seq, title: t.title })),
    previousContextSummary: latest?.contextSummary ?? null,
  });

  return deps.reflections.create({
    projectId,
    insights: output.insights,
    suggestedTasks: output.suggestedTasks,
    skillSuggestions: output.skillSuggestions,
    contextSummary: output.contextSummary,
    analyzedTaskCount: allReferenceTasks.length,
    triggerReason,
  });
}
