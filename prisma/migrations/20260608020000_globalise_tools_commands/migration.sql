-- Migration: Tool/Command 글로벌화
-- ProjectTool: userId 추가, projectId nullable
-- ProjectCommand: projectId → userId (글로벌 커맨드)

-- 1. userId 컬럼 추가 (nullable 먼저)
ALTER TABLE "ProjectTool" ADD COLUMN "userId" TEXT;
ALTER TABLE "ProjectCommand" ADD COLUMN "userId" TEXT;

-- 2. 데이터 마이그레이션: 프로젝트 OWNER userId 로 채우기
UPDATE "ProjectTool" t
SET "userId" = (
  SELECT m."userId" FROM "ProjectMember" m
  WHERE m."projectId" = t."projectId" AND m."role" = 'OWNER'
  LIMIT 1
);

UPDATE "ProjectCommand" c
SET "userId" = (
  SELECT m."userId" FROM "ProjectMember" m
  WHERE m."projectId" = c."projectId" AND m."role" = 'OWNER'
  LIMIT 1
);

-- owner가 없는 경우 project ownerId 폴백
UPDATE "ProjectTool" t
SET "userId" = (SELECT "ownerId" FROM "Project" WHERE "id" = t."projectId")
WHERE "userId" IS NULL;

UPDATE "ProjectCommand" c
SET "userId" = (SELECT "ownerId" FROM "Project" WHERE "id" = c."projectId")
WHERE "userId" IS NULL;

-- 3. NOT NULL 적용
ALTER TABLE "ProjectTool" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ProjectCommand" ALTER COLUMN "userId" SET NOT NULL;

-- 4. ProjectTool: projectId nullable로 변경 + 인덱스 재구성
DROP INDEX IF EXISTS "ProjectTool_projectId_slug_key";
ALTER TABLE "ProjectTool" ALTER COLUMN "projectId" DROP NOT NULL;
CREATE UNIQUE INDEX "ProjectTool_projectId_slug_key" ON "ProjectTool"("projectId", "slug") WHERE "projectId" IS NOT NULL;
-- 글로벌 툴 고유성: 같은 유저는 slug 중복 불가 (projectId IS NULL 인 경우만)
CREATE UNIQUE INDEX "ProjectTool_userId_slug_global_key" ON "ProjectTool"("userId", "slug") WHERE "projectId" IS NULL;
CREATE INDEX "ProjectTool_userId_idx" ON "ProjectTool"("userId");

-- FK: User → ProjectTool
ALTER TABLE "ProjectTool" ADD CONSTRAINT "ProjectTool_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. ProjectCommand: projectId 제거, userId 기반으로 전환
ALTER TABLE "ProjectCommand" DROP CONSTRAINT IF EXISTS "ProjectCommand_projectId_fkey";
DROP INDEX IF EXISTS "ProjectCommand_projectId_slug_key";
DROP INDEX IF EXISTS "ProjectCommand_projectId_idx";
ALTER TABLE "ProjectCommand" DROP COLUMN "projectId";

CREATE UNIQUE INDEX "ProjectCommand_userId_slug_key" ON "ProjectCommand"("userId", "slug");
CREATE INDEX "ProjectCommand_userId_idx" ON "ProjectCommand"("userId");

-- FK: User → ProjectCommand
ALTER TABLE "ProjectCommand" ADD CONSTRAINT "ProjectCommand_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
