import type { ProjectToolRecord } from "@/domain/memory/types";

export type ProjectCustomSkillRecord = ProjectToolRecord;

export type CreateCustomSkillInput = {
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

export type UpsertCustomSkillInput = {
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

export type CustomSkillRepository = {
  create: (input: CreateCustomSkillInput) => Promise<ProjectToolRecord>;
  upsertByName: (input: UpsertCustomSkillInput) => Promise<ProjectToolRecord>;
  listByProject: (projectId: string) => Promise<ProjectToolRecord[]>;
  findBySlug: (projectId: string, slug: string) => Promise<ProjectToolRecord | null>;
  setEnabled: (projectId: string, slug: string, isEnabled: boolean) => Promise<void>;
};
