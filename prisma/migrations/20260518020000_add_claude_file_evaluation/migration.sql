-- CreateTable
CREATE TABLE "ClaudeFileEvaluation" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT,
    "errorMessage" TEXT,
    "basedOnBasic" BOOLEAN NOT NULL DEFAULT true,
    "basedOnProject" BOOLEAN NOT NULL DEFAULT false,
    "basedOnTeam" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "absPath" TEXT NOT NULL,

    CONSTRAINT "ClaudeFileEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaudeFileEvaluation_projectId_idx" ON "ClaudeFileEvaluation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaudeFileEvaluation_projectId_absPath_key" ON "ClaudeFileEvaluation"("projectId", "absPath");

-- AddForeignKey
ALTER TABLE "ClaudeFileEvaluation" ADD CONSTRAINT "ClaudeFileEvaluation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
