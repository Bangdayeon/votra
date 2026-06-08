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
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}): ProjectCommandRecord {
  return { ...row };
}

export const prismaCommandRepository: CommandRepository = {
  async upsertByName(input: UpsertCommandInput) {
    const slug = input.slug ?? toKebabSlug(input.name);
    const row = await prisma.projectCommand.upsert({
      where: { userId_slug: { userId: input.userId, slug } },
      create: {
        userId: input.userId,
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
      where: { userId: input.userId, slug: { startsWith: baseSlug } },
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
        userId: input.userId,
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

  async listByUser(userId: string) {
    const rows = await prisma.projectCommand.findMany({
      where: { userId },
      orderBy: [{ folder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toRecord);
  },

  async findBySlug(userId: string, slug: string) {
    const row = await prisma.projectCommand.findUnique({
      where: { userId_slug: { userId, slug } },
    });
    return row ? toRecord(row) : null;
  },
};
