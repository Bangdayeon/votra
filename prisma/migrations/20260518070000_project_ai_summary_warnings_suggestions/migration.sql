-- 캐시 데이터이므로 기존 행은 비우고 새 구조로 재생성하도록 함.
ALTER TABLE "ProjectAiSummary" DROP COLUMN "solution";
ALTER TABLE "ProjectAiSummary" ADD COLUMN "warnings" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "ProjectAiSummary" ADD COLUMN "suggestions" JSONB NOT NULL DEFAULT '[]'::jsonb;
