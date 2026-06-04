-- CreateEnum
CREATE TYPE "MemoryTier" AS ENUM ('ACTIVE', 'LONG_TERM', 'ARCHIVED', 'TRASH');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "accessCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "memoryTier" "MemoryTier" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "ProjectMemoryReflection" (
    "id" TEXT NOT NULL,
    "insights" JSONB NOT NULL DEFAULT '[]',
    "suggestedTasks" JSONB NOT NULL DEFAULT '[]',
    "contextSummary" TEXT,
    "analyzedTaskCount" INTEGER NOT NULL DEFAULT 0,
    "triggerReason" TEXT NOT NULL DEFAULT 'cron',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectMemoryReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMemoryReflection_projectId_createdAt_idx" ON "ProjectMemoryReflection"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_projectId_memoryTier_idx" ON "Task"("projectId", "memoryTier");

-- CreateIndex
CREATE INDEX "Task_projectId_lastAccessedAt_idx" ON "Task"("projectId", "lastAccessedAt");

-- AddForeignKey
ALTER TABLE "ProjectMemoryReflection" ADD CONSTRAINT "ProjectMemoryReflection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
