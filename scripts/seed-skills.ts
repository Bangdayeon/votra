/**
 * 모든 프로젝트에 기본 스킬을 upsert.
 * vercel.json buildCommand에서 실행돼요: npm run db:deploy && npx tsx scripts/seed-skills.ts && npm run build
 *
 * 실행: npx tsx scripts/seed-skills.ts
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_SKILLS } from "../src/domain/memory/defaultSkills";

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true } });
  console.log(`프로젝트 ${projects.length}개 발견`);

  let total = 0;
  for (const project of projects) {
    for (const skill of DEFAULT_SKILLS) {
      await prisma.projectTool.upsert({
        where: { projectId_slug: { projectId: project.id, slug: skill.slug } },
        create: {
          projectId: project.id,
          slug: skill.slug,
          name: skill.name,
          description: skill.description,
          folder: skill.folder,
          content: skill.content,
          contextHint: skill.contextHint ?? null,
        },
        update: {
          name: skill.name,
          description: skill.description,
          folder: skill.folder,
          content: skill.content,
          contextHint: skill.contextHint ?? null,
        },
      });
      total++;
    }
  }

  console.log(`완료: ${DEFAULT_SKILLS.length}개 스킬 × ${projects.length}개 프로젝트 = ${total}건 upsert`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
