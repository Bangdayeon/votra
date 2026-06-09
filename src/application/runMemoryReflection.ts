import type { ExternalIngestRepository } from "@/application/ports/externalIngestRepository";
import type { MemoryReflectionRepository } from "@/application/ports/memoryReflectionRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import type { ToolRepository } from "@/application/ports/toolRepository";
import type { MemoryReflectionRecord, ReflectionInsight, ToolEnrichment, ToolSuggestion } from "@/domain/memory/memoryTierTypes";

export type ExternalIngestItem = {
  source: string;
  content: string;
  sourceUrl: string | null;
};

export type ReflectionInput = {
  tasks: Array<{ seq: number; title: string; priority: number; keyDecisions: string[]; outcome: string | null }>;
  activeTasks: Array<{ seq: number; title: string }>;
  existingTools: Array<{ name: string; description: string; folder: string; content: string }>;
  previousContextSummary: string | null;
  externalData?: ExternalIngestItem[];
};

export type ReflectionOutput = {
  insights: ReflectionInsight[];
  toolSuggestions: ToolSuggestion[];
  toolEnrichments: ToolEnrichment[];
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
    tools: ToolRepository;
    engine: ReflectionEngine;
    externalIngests: ExternalIngestRepository;
  },
): Promise<MemoryReflectionRecord> {
  const [doneTasks, longTermTasks, activeTasks, latest, allTools, externalData] = await Promise.all([
    deps.tasks.listByFilter({ projectId, status: "DONE", limit: 50 }),
    deps.tasks.listByMemoryTier({ projectId, tier: "LONG_TERM", limit: 20 }),
    deps.tasks.listByFilter({ projectId, limit: 20 }),
    deps.reflections.getLatest(projectId),
    deps.tools.listByProject(projectId),
    deps.externalIngests.listUnprocessed({ projectId, limit: 20 }),
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
    existingTools: allTools.map((t) => ({ name: t.name, description: t.description, folder: t.folder, content: t.content })),
    previousContextSummary: latest?.contextSummary ?? null,
    externalData: externalData.map((d) => ({ source: d.source, content: d.content, sourceUrl: d.sourceUrl })),
  });

  const reflection = await deps.reflections.create({
    projectId,
    insights: output.insights,
    suggestedTasks: [],
    toolSuggestions: output.toolSuggestions,
    toolEnrichments: output.toolEnrichments,
    contextSummary: output.contextSummary,
    analyzedTaskCount: allReferenceTasks.length,
    triggerReason,
  });

  if (externalData.length > 0) {
    await deps.externalIngests.markProcessed(externalData.map((d) => d.id));
  }

  return reflection;
}
