-- CreateTable
CREATE TABLE "PolicyRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PolicyRule_key_key" ON "PolicyRule"("key");

-- Seed default rules (현재 휴리스틱과 1:1 매칭. 사용자가 별도로 수정하기 전까지의 기본값).
INSERT INTO "PolicyRule" ("id", "key", "label", "description", "maxPoints", "displayOrder", "updatedAt") VALUES
  ('pr_seed_commands',      'commands',      '명령어/워크플로', '빌드·테스트·배포 같은 핵심 명령어가 실행 가능한 형태(코드 펜스)로 적혀 있는지 봐요.', 20, 1, CURRENT_TIMESTAMP),
  ('pr_seed_architecture',  'architecture',  '아키텍처 명료성', '폴더 구조, 레이어, 의존 방향 등 코드 베이스의 큰 그림을 한눈에 알 수 있게 적혀 있는지 봐요.', 20, 2, CURRENT_TIMESTAMP),
  ('pr_seed_patterns',      'patterns',      '숨겨진 패턴',     '주의/금지/예외처럼 코드만 봐선 알기 어려운 함정과 규칙이 명시돼 있는지 봐요.',                15, 3, CURRENT_TIMESTAMP),
  ('pr_seed_conciseness',   'conciseness',   '간결성',          '핵심만 담겨 너무 길지 않은지 봐요. 길수록 AI 가 중요한 부분을 놓치기 쉬워요.',                 15, 4, CURRENT_TIMESTAMP),
  ('pr_seed_currency',      'currency',      '최신성',          '최근에 갱신된 문서인지 봐요. 오래된 문서는 실제 코드와 어긋날 위험이 커요.',                  15, 5, CURRENT_TIMESTAMP),
  ('pr_seed_actionability', 'actionability', '실행 가능성',     '"무엇을 하라"는 구체적인 행동 지침(단계, 동사형 지시)이 있는지 봐요.',                       15, 6, CURRENT_TIMESTAMP);
