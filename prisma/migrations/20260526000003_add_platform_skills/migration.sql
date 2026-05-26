-- CreateTable
CREATE TABLE "PlatformSkill" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contextHint" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSkill_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "ProjectSkillConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,

    CONSTRAINT "ProjectSkillConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSkillConfig_projectId_skillSlug_key" ON "ProjectSkillConfig"("projectId", "skillSlug");

-- CreateIndex
CREATE INDEX "ProjectSkillConfig_projectId_idx" ON "ProjectSkillConfig"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectSkillConfig" ADD CONSTRAINT "ProjectSkillConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSkillConfig" ADD CONSTRAINT "ProjectSkillConfig_skillSlug_fkey" FOREIGN KEY ("skillSlug") REFERENCES "PlatformSkill"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
