-- CreateTable
CREATE TABLE "ClaudeFile" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "absPath" TEXT NOT NULL,
    "displayPath" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mtimeMs" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ClaudeFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaudeFile_projectId_idx" ON "ClaudeFile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaudeFile_projectId_absPath_key" ON "ClaudeFile"("projectId", "absPath");

-- AddForeignKey
ALTER TABLE "ClaudeFile" ADD CONSTRAINT "ClaudeFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
