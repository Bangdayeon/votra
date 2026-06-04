import type { MemoryReflectionRecord, ReflectionInsight, ReflectionSuggestedTask, SkillSuggestion } from "@/domain/memory/memoryTierTypes";

export type CreateReflectionInput = {
  projectId: string;
  insights: ReflectionInsight[];
  suggestedTasks: ReflectionSuggestedTask[];
  skillSuggestions: SkillSuggestion[];
  contextSummary: string | null;
  analyzedTaskCount: number;
  triggerReason: string;
};

export type MemoryReflectionRepository = {
  create: (input: CreateReflectionInput) => Promise<MemoryReflectionRecord>;
  listByProject: (args: { projectId: string; limit: number }) => Promise<MemoryReflectionRecord[]>;
  getLatest: (projectId: string) => Promise<MemoryReflectionRecord | null>;
};
