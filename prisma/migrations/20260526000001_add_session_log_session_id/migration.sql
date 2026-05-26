-- SessionLog에 sessionId, updatedAt 컬럼 추가 및 유니크 인덱스 생성
ALTER TABLE "SessionLog"
  ADD COLUMN "sessionId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- sessionId가 not null인 경우에만 유니크 제약 적용 (PostgreSQL NULL 동작 일치)
CREATE UNIQUE INDEX "SessionLog_projectId_sessionId_key"
  ON "SessionLog"("projectId", "sessionId");
