import "server-only";

import type { SkillRepository } from "@/application/ports/skillRepository";
import type { SkillRecord } from "@/domain/memory/types";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaSkillRepository: SkillRepository = {
  async listWithConfig(projectId) {
    const [skills, configs] = await Promise.all([
      prisma.platformSkill.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { slug: "asc" }],
        select: { slug: true, name: true, description: true, category: true, contextHint: true, isActive: true },
      }),
      prisma.projectSkillConfig.findMany({
        where: { projectId },
        select: { skillSlug: true, enabled: true },
      }),
    ]);

    const configMap = new Map(configs.map((c) => [c.skillSlug, c.enabled]));

    return skills.map((s): SkillRecord => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category,
      contextHint: s.contextHint,
      isActive: s.isActive,
      enabled: configMap.get(s.slug) ?? true,
    }));
  },

  async setEnabled(projectId, slug, enabled) {
    await prisma.projectSkillConfig.upsert({
      where: { projectId_skillSlug: { projectId, skillSlug: slug } },
      create: { projectId, skillSlug: slug, enabled },
      update: { enabled },
    });
  },
};
