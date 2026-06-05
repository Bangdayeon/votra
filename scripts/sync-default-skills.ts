/**
 * 기본 스킬 콘텐츠를 최신 DEFAULT_SKILLS로 모든 프로젝트에 일괄 동기화.
 *
 * 실행: npx tsx scripts/sync-default-skills.ts
 * (또는 npm run sync:skills)
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_SKILLS } from "../src/domain/memory/defaultSkills";

const prisma = new PrismaClient();

async function main() {
  let total = 0;
  for (const skill of DEFAULT_SKILLS) {
    const result = await prisma.projectTool.updateMany({
      where: { slug: skill.slug },
      data: {
        name: skill.name,
        description: skill.description,
        folder: skill.folder,
        content: skill.content,
        contextHint: skill.contextHint,
      },
    });
    console.log(`  ✓ ${skill.slug}: ${result.count}개 프로젝트 업데이트`);
    total += result.count;
  }
  console.log(`\n완료: ${DEFAULT_SKILLS.length}개 스킬, 총 ${total}건 동기화되었어요.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
