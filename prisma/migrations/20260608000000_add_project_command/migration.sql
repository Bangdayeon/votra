CREATE TABLE "ProjectCommand" (
    "id"          TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "folder"      TEXT NOT NULL DEFAULT '기타',
    "content"     TEXT NOT NULL,
    "isBuiltIn"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "projectId"   TEXT NOT NULL,

    CONSTRAINT "ProjectCommand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectCommand_projectId_slug_key" ON "ProjectCommand"("projectId", "slug");
CREATE INDEX "ProjectCommand_projectId_idx" ON "ProjectCommand"("projectId");

ALTER TABLE "ProjectCommand"
    ADD CONSTRAINT "ProjectCommand_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
