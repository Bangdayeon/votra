/**
 * 모든 유저에게 기본 스킬(글로벌 툴)을 upsert.
 * vercel.json buildCommand에서 실행돼요: npm run db:deploy && npx tsx scripts/seed-skills.ts && npm run build
 *
 * 실행: npx tsx scripts/seed-skills.ts
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_SKILLS } from "../src/domain/memory/defaultSkills";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  console.log(`유저 ${users.length}명 발견`);

  let total = 0;
  for (const user of users) {
    for (const skill of DEFAULT_SKILLS) {
      const existing = await prisma.projectTool.findFirst({
        where: { userId: user.id, slug: skill.slug, projectId: null },
      });
      if (existing) {
        await prisma.projectTool.update({
          where: { id: existing.id },
          data: {
            name: skill.name,
            description: skill.description,
            folder: skill.folder,
            content: skill.content,
            contextHint: skill.contextHint ?? null,
          },
        });
      } else {
        await prisma.projectTool.create({
          data: {
            userId: user.id,
            projectId: null,
            slug: skill.slug,
            name: skill.name,
            description: skill.description,
            folder: skill.folder,
            content: skill.content,
            contextHint: skill.contextHint ?? null,
          },
        });
      }
      total++;
    }
  }

  console.log(`완료: ${DEFAULT_SKILLS.length}개 스킬 × ${users.length}명 유저 = ${total}건 upsert`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
