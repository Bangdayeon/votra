import type { ProjectToolRecord } from "@/domain/memory/types";

export type CreateToolInput = {
  projectId: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  patternSummary?: string;
  contextHint?: string;
  hookEvent?: string;
  hookMatcher?: string;
  hookScript?: string;
};

export type UpsertToolInput = {
  projectId: string;
  slug?: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  patternSummary?: string;
  contextHint?: string;
  hookEvent?: string;
  hookMatcher?: string;
  hookScript?: string;
};

export type ToolRepository = {
  create: (input: CreateToolInput) => Promise<ProjectToolRecord>;
  upsertByName: (input: UpsertToolInput) => Promise<ProjectToolRecord>;
  listByProject: (projectId: string) => Promise<ProjectToolRecord[]>;
  findBySlug: (projectId: string, slug: string) => Promise<ProjectToolRecord | null>;
  setEnabled: (projectId: string, slug: string, isEnabled: boolean) => Promise<void>;
};
