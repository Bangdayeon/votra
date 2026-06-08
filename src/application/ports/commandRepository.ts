import type { ProjectCommandRecord } from "@/domain/memory/types";

export type CreateCommandInput = {
  userId: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  isBuiltIn?: boolean;
};

export type UpsertCommandInput = {
  userId: string;
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
  listByUser: (userId: string) => Promise<ProjectCommandRecord[]>;
  findBySlug: (userId: string, slug: string) => Promise<ProjectCommandRecord | null>;
};
