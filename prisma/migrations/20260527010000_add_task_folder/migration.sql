-- TaskFolder 모델 추가
CREATE TABLE "TaskFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TaskFolder_pkey" PRIMARY KEY ("id")
);

-- Task에 folderId 추가
ALTER TABLE "Task" ADD COLUMN "folderId" TEXT;

-- TaskFolder 인덱스
CREATE INDEX "TaskFolder_projectId_idx" ON "TaskFolder"("projectId");
CREATE INDEX "TaskFolder_userId_idx" ON "TaskFolder"("userId");

-- Task 폴더 인덱스
CREATE INDEX "Task_projectId_folderId_idx" ON "Task"("projectId", "folderId");

-- TaskFolder FK
ALTER TABLE "TaskFolder" ADD CONSTRAINT "TaskFolder_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskFolder" ADD CONSTRAINT "TaskFolder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Task FK
ALTER TABLE "Task" ADD CONSTRAINT "Task_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "TaskFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
