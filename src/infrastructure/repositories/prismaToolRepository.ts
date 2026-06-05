import "server-only";

import type { CreateToolInput, ToolRepository, UpsertToolInput } from "@/application/ports/toolRepository";
import type { ProjectToolRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

function toKebabSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .slice(0, 64)
    || "custom-tool";
}

function toRecord(row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  patternSummary: string | null;
  contextHint: string | null;
  hookEvent: string | null;
  hookMatcher: string | null;
  hookScript: string | null;
  isEnabled: boolean;
  isBuiltIn: boolean;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}): ProjectToolRecord {
  return { ...row };
}

export const prismaToolRepository: ToolRepository = {
  async upsertByName(input: UpsertToolInput) {
    const slug = input.slug ?? toKebabSlug(input.name);
    const row = await prisma.projectTool.upsert({
      where: { projectId_slug: { projectId: input.projectId, slug } },
      create: {
        projectId: input.projectId,
        slug,
        name: input.name,
        description: input.description,
        folder: input.folder,
        content: input.content,
        isBuiltIn: input.isBuiltIn ?? false,
        patternSummary: input.patternSummary ?? null,
        contextHint: input.contextHint ?? null,
        hookEvent: input.hookEvent ?? null,
        hookMatcher: input.hookMatcher ?? null,
        hookScript: input.hookScript ?? null,
      },
      update: {
        description: input.description,
        folder: input.folder,
        content: input.content,
        isBuiltIn: input.isBuiltIn ?? false,
        patternSummary: input.patternSummary ?? null,
        contextHint: input.contextHint ?? null,
        hookEvent: input.hookEvent ?? null,
        hookMatcher: input.hookMatcher ?? null,
        hookScript: input.hookScript ?? null,
      },
    });
    return toRecord(row);
  },

  async create(input: CreateToolInput) {
    const baseSlug = toKebabSlug(input.name);
    const existing = await prisma.projectTool.findMany({
      where: { projectId: input.projectId, slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slugSet = new Set(existing.map((r) => r.slug));
    let slug = baseSlug;
    let i = 2;
    while (slugSet.has(slug)) {
      slug = `${baseSlug}-${i++}`;
    }
    const row = await prisma.projectTool.create({
      data: {
        projectId: input.projectId,
        slug,
        name: input.name,
        description: input.description,
        folder: input.folder,
        content: input.content,
        isBuiltIn: input.isBuiltIn ?? false,
        patternSummary: input.patternSummary ?? null,
        contextHint: input.contextHint ?? null,
        hookEvent: input.hookEvent ?? null,
        hookMatcher: input.hookMatcher ?? null,
        hookScript: input.hookScript ?? null,
      },
    });
    return toRecord(row);
  },

  async listByProject(projectId: string) {
    const rows = await prisma.projectTool.findMany({
      where: { projectId },
      orderBy: [{ folder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toRecord);
  },

  async findBySlug(projectId: string, slug: string) {
    const row = await prisma.projectTool.findUnique({
      where: { projectId_slug: { projectId, slug } },
    });
    return row ? toRecord(row) : null;
  },

  async setEnabled(projectId: string, slug: string, isEnabled: boolean) {
    await prisma.projectTool.update({
      where: { projectId_slug: { projectId, slug } },
      data: { isEnabled },
    });
  },
};
