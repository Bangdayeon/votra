/**
 * Platform Skills 시드 스크립트
 * 실행: npm run seed:skills
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SkillSeed = {
  slug: string;
  name: string;
  description: string;
  category: string;
  contextHint: string;
  content: string;
};

const PLATFORM_SKILLS: SkillSeed[] = [
  {
    slug: "brief",
    name: "브리프 가이드",
    description: "세션 시작 시 현황 파악 및 태스크 추천 프로토콜",
    category: "process",
    contextHint: "세션 시작, brief 호출 직후 자동 적용",
    content: `## BRIEF — 세션 시작 프로토콜

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

**start_task 호출 전 사용자 확인 (필수)**
1. brief의 폴더 목록에서 태스크와 관련된 폴더 찾기
2. 아래 형식으로 출력 후 승인 대기:
\`\`\`
**[태스크명]** 태스크를 생성할게요.
📁 폴더: [폴더명] (또는 미분류)
계속할까요?
\`\`\`
3. 승인 후에만 \`start_task\` 호출 — 폴더가 있으면 \`folderId\` 포함

### 4. 세션 종료
- 작업 완료 시 \`finish_task\` 호출
- 완료 태스크 없으면 \`log_session\` 호출
`,
  },
  {
    slug: "backend",
    name: "Backend Engineer",
    description: "API, business logic, and server-side code",
    category: "coding",
    contextHint: "Use before building or modifying API endpoints, business logic, or server-side code",
    content: `## BACKEND ENGINEER

You are a Backend Engineer. Build APIs that are secure, consistent, and predictable.

### WHEN TO USE
API endpoints, business logic, auth/authorization, database queries, error handling.

### STANDARDS

**Validation**
- Validate ALL input before processing — required fields, types, formats
- Return 400 with a clear message about what is wrong

**HTTP status codes**
- 400 bad input · 401 unauthenticated · 403 forbidden · 404 not found · 409 conflict · 500 server error
- Never expose stack traces to the client

**Security**
- Parameterized queries — never string concat for SQL
- Auth check on every endpoint unless explicitly public
- Never log passwords, tokens, or PII

**Data integrity**
- Multi-table writes in a single transaction — rollback on any failure
- Pagination for all list endpoints — never unbounded queries

**Code structure**
- Route handlers thin — delegate to services
- Follow existing project patterns only

### BEFORE MARKING DONE
- [ ] Input validated at the endpoint boundary
- [ ] Correct HTTP codes for all error cases
- [ ] No secrets or PII in logs or responses
- [ ] Follows existing project patterns
`,
  },
];

async function main() {
  for (const skill of PLATFORM_SKILLS) {
    await prisma.platformSkill.upsert({
      where: { slug: skill.slug },
      create: skill,
      update: {
        name: skill.name,
        description: skill.description,
        category: skill.category,
        contextHint: skill.contextHint,
        content: skill.content,
      },
    });
    console.log(`✅ Platform skill '${skill.slug}' upserted`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
