import "server-only";

import type { CommandRepository, CreateCommandInput, UpsertCommandInput } from "@/application/ports/commandRepository";
import type { ProjectCommandRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

function toKebabSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "")
    .slice(0, 64)
    || "custom-command";
}

function toRecord(row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  folder: string;
  content: string;
  isBuiltIn: boolean;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}): ProjectCommandRecord {
  return { ...row };
}

export const prismaCommandRepository: CommandRepository = {
  async upsertByName(input: UpsertCommandInput) {
    const slug = input.slug ?? toKebabSlug(input.name);
    const row = await prisma.projectCommand.upsert({
      where: { projectId_slug: { projectId: input.projectId, slug } },
      create: {
        projectId: input.projectId,
        slug,
        name: input.name,
        description: input.description,
        folder: input.folder,
        content: input.content,
        isBuiltIn: input.isBuiltIn ?? false,
      },
      update: {
        description: input.description,
        folder: input.folder,
        content: input.content,
        isBuiltIn: input.isBuiltIn ?? false,
      },
    });
    return toRecord(row);
  },

  async create(input: CreateCommandInput) {
    const baseSlug = toKebabSlug(input.name);
    const existing = await prisma.projectCommand.findMany({
      where: { projectId: input.projectId, slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slugSet = new Set(existing.map((r) => r.slug));
    let slug = baseSlug;
    let i = 2;
    while (slugSet.has(slug)) {
      slug = `${baseSlug}-${i++}`;
    }
    const row = await prisma.projectCommand.create({
      data: {
        projectId: input.projectId,
        slug,
        name: input.name,
        description: input.description,
        folder: input.folder,
        content: input.content,
        isBuiltIn: input.isBuiltIn ?? false,
      },
    });
    return toRecord(row);
  },

  async listByProject(projectId: string) {
    const rows = await prisma.projectCommand.findMany({
      where: { projectId },
      orderBy: [{ folder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toRecord);
  },

  async findBySlug(projectId: string, slug: string) {
    const row = await prisma.projectCommand.findUnique({
      where: { projectId_slug: { projectId, slug } },
    });
    return row ? toRecord(row) : null;
  },
};
