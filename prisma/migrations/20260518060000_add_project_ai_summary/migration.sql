-- CreateTable
CREATE TABLE "ProjectAiSummary" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectAiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAiSummary_projectId_key" ON "ProjectAiSummary"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectAiSummary" ADD CONSTRAINT "ProjectAiSummary_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
