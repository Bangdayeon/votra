export type ReflectionInsight = {
  type: "pattern" | "insight" | "risk";
  text: string;
};

export type ReflectionSuggestedTask = {
  title: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type SkillSuggestion = {
  name: string;
  description: string;
  folder: string;
  content: string;
  patternSummary: string;
  contextHint: string;
  hookEvent?: string | null;
  hookMatcher?: string | null;
  hookScript?: string | null;
};

export type MemoryReflectionRecord = {
  id: string;
  projectId: string;
  insights: ReflectionInsight[];
  suggestedTasks: ReflectionSuggestedTask[];
  skillSuggestions: SkillSuggestion[];
  contextSummary: string | null;
  analyzedTaskCount: number;
  triggerReason: string;
  createdAt: Date;
};

export type MemoryDecaySettings = {
  activeToArchivedDays: number;
  archivedToTrashDays: number;
  reflectionThreshold: number;
  longTermMinAccessCount: number;
  longTermMinPriority: number;
};

export const DEFAULT_MEMORY_SETTINGS: MemoryDecaySettings = {
  activeToArchivedDays: 30,
  archivedToTrashDays: 30,
  reflectionThreshold: 5,
  longTermMinAccessCount: 3,
  longTermMinPriority: 7,
};
