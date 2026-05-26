/**
 * Platform Skills 시드 스크립트
 * 실행: npx tsx scripts/seed-skills.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BRIEF_SKILL_CONTENT = `## BRIEF — 세션 시작 프로토콜

### 1. 현황 요약 출력
아래 형식으로 출력:
\`\`\`
---
[프로젝트명] 현황

최근 작업 흐름: [lastSessionSummary 또는 recentlyDone 기반]
진행 중: [inProgressTasks]
대기 중: [pendingTasks, 우선순위 순]
메모리: [recentDecisions 요약]
---
\`\`\`

### 2. AI 추천 태스크 안내
\`recommendedNextTasks\`가 있으면:
- 우선순위(high → medium → low) 순으로 표시
- 각 태스크의 title과 reason 제시
- "위 중 바로 시작할 작업이 있나요?" 물어보기
- 유저가 선택하면 즉시 \`start_task\` 호출

\`recommendedNextTasks\`가 없으면:
- 대기 중 태스크에서 우선순위 순 제안
- 없으면 유저에게 하고 싶은 작업 물어보기

### 3. 유저 작업 요청 규칙 (MANDATORY)
유저가 어떤 작업이든 요청하면:
- 반드시 먼저 \`start_task\` 호출 (태스크 생성)
- 태스크 없이 코드 작업 절대 금지
- 간단해 보여도 예외 없음

### 4. 세션 종료
- 작업 완료 시 \`finish_task\` 호출
- 완료 태스크 없으면 \`log_session\` 호출
`;

async function main() {
  await prisma.platformSkill.upsert({
    where: { slug: "brief" },
    create: {
      slug: "brief",
      name: "브리프 가이드",
      description: "세션 시작 시 현황 파악 및 태스크 추천 프로토콜",
      contextHint: "세션 시작, brief 호출 직후 자동 적용",
      content: BRIEF_SKILL_CONTENT,
    },
    update: {
      content: BRIEF_SKILL_CONTENT,
      description: "세션 시작 시 현황 파악 및 태스크 추천 프로토콜",
      contextHint: "세션 시작, brief 호출 직후 자동 적용",
    },
  });

  console.log("✅ Platform skill 'brief' upserted");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
