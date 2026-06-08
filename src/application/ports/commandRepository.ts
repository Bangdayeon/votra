import type { ProjectCommandRecord } from "@/domain/memory/types";

export type CreateCommandInput = {
  projectId: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  isBuiltIn?: boolean;
};

export type UpsertCommandInput = {
  projectId: string;
  slug?: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  isBuiltIn?: boolean;
};

export type CommandRepository = {
  create: (input: CreateCommandInput) => Promise<ProjectCommandRecord>;
  upsertByName: (input: UpsertCommandInput) => Promise<ProjectCommandRecord>;
  listByProject: (projectId: string) => Promise<ProjectCommandRecord[]>;
  findBySlug: (projectId: string, slug: string) => Promise<ProjectCommandRecord | null>;
};
