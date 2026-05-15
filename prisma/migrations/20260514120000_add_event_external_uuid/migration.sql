-- AlterTable
ALTER TABLE "Event" ADD COLUMN "externalUuid" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_sessionId_externalUuid_key" ON "Event"("sessionId", "externalUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Session_projectId_externalId_key" ON "Session"("projectId", "externalId");
