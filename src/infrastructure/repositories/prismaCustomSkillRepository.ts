import "server-only";

import type { CreateCustomSkillInput, CustomSkillRepository, UpsertCustomSkillInput } from "@/application/ports/customSkillRepository";
import type { ProjectCustomSkillRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

function toKebabSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .slice(0, 64)
    || "custom-skill";
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
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}): ProjectCustomSkillRecord {
  return { ...row };
}

export const prismaCustomSkillRepository: CustomSkillRepository = {
  async upsertByName(input: UpsertCustomSkillInput) {
    const slug = input.slug ?? toKebabSlug(input.name);
    const row = await prisma.projectCustomSkill.upsert({
      where: { projectId_slug: { projectId: input.projectId, slug } },
      create: {
        projectId: input.projectId,
        slug,
        name: input.name,
        description: input.description,
        folder: input.folder,
        content: input.content,
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
        patternSummary: input.patternSummary ?? null,
        contextHint: input.contextHint ?? null,
        hookEvent: input.hookEvent ?? null,
        hookMatcher: input.hookMatcher ?? null,
        hookScript: input.hookScript ?? null,
      },
    });
    return toRecord(row);
  },

  async create(input: CreateCustomSkillInput) {
    const baseSlug = toKebabSlug(input.name);
    const existing = await prisma.projectCustomSkill.findMany({
      where: { projectId: input.projectId, slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slugSet = new Set(existing.map((r) => r.slug));
    let slug = baseSlug;
    let i = 2;
    while (slugSet.has(slug)) {
      slug = `${baseSlug}-${i++}`;
    }
    const row = await prisma.projectCustomSkill.create({
      data: {
        projectId: input.projectId,
        slug,
        name: input.name,
        description: input.description,
        folder: input.folder,
        content: input.content,
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
    const rows = await prisma.projectCustomSkill.findMany({
      where: { projectId },
      orderBy: [{ folder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toRecord);
  },

  async findBySlug(projectId: string, slug: string) {
    const row = await prisma.projectCustomSkill.findUnique({
      where: { projectId_slug: { projectId, slug } },
    });
    return row ? toRecord(row) : null;
  },

  async setEnabled(projectId: string, slug: string, isEnabled: boolean) {
    await prisma.projectCustomSkill.update({
      where: { projectId_slug: { projectId, slug } },
      data: { isEnabled },
    });
  },
};
