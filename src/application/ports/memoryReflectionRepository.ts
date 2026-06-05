import type { MemoryReflectionRecord, ReflectionInsight, ReflectionSuggestedTask, ToolSuggestion } from "@/domain/memory/memoryTierTypes";

export type CreateReflectionInput = {
  projectId: string;
  insights: ReflectionInsight[];
  suggestedTasks: ReflectionSuggestedTask[];
  toolSuggestions: ToolSuggestion[];
  contextSummary: string | null;
  analyzedTaskCount: number;
  triggerReason: string;
};

export type MemoryReflectionRepository = {
  create: (input: CreateReflectionInput) => Promise<MemoryReflectionRecord>;
  listByProject: (args: { projectId: string; limit: number }) => Promise<MemoryReflectionRecord[]>;
  getLatest: (projectId: string) => Promise<MemoryReflectionRecord | null>;
};
