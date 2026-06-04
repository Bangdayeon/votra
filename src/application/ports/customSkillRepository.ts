import type { ProjectCustomSkillRecord } from "@/domain/memory/types";

export type CreateCustomSkillInput = {
  projectId: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  patternSummary?: string;
  contextHint?: string;
};

export type UpsertCustomSkillInput = {
  projectId: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  patternSummary?: string;
  contextHint?: string;
};

export type CustomSkillRepository = {
  create: (input: CreateCustomSkillInput) => Promise<ProjectCustomSkillRecord>;
  upsertByName: (input: UpsertCustomSkillInput) => Promise<ProjectCustomSkillRecord>;
  listByProject: (projectId: string) => Promise<ProjectCustomSkillRecord[]>;
  findBySlug: (projectId: string, slug: string) => Promise<ProjectCustomSkillRecord | null>;
  setEnabled: (projectId: string, slug: string, isEnabled: boolean) => Promise<void>;
};
