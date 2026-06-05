CREATE TABLE "ProjectMemoryContext" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMemoryContext_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectMemoryContext_projectId_key" ON "ProjectMemoryContext"("projectId");

ALTER TABLE "ProjectMemoryContext" ADD CONSTRAINT "ProjectMemoryContext_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
