CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "aiTool" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionLog_projectId_createdAt_idx" ON "SessionLog"("projectId", "createdAt" DESC);
CREATE INDEX "SessionLog_userId_idx" ON "SessionLog"("userId");

ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
