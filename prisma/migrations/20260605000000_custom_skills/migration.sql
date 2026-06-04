-- AlterTable: add skillSuggestions to ProjectMemoryReflection
ALTER TABLE "ProjectMemoryReflection" ADD COLUMN "skillSuggestions" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "ProjectCustomSkill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "folder" TEXT NOT NULL DEFAULT '기타',
    "content" TEXT NOT NULL,
    "patternSummary" TEXT,
    "contextHint" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectCustomSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCustomSkill_projectId_slug_key" ON "ProjectCustomSkill"("projectId", "slug");

-- CreateIndex
CREATE INDEX "ProjectCustomSkill_projectId_idx" ON "ProjectCustomSkill"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectCustomSkill" ADD CONSTRAINT "ProjectCustomSkill_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
