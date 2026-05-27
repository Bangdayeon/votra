-- Task 테이블에 수동 정렬 순서 컬럼 추가
ALTER TABLE "Task" ADD COLUMN "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 기존 태스크는 seq 기반 순서로 초기화
UPDATE "Task" SET "sortOrder" = seq;
