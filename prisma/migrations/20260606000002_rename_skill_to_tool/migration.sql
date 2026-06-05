-- Task.module → Task.tool
ALTER TABLE "Task" RENAME COLUMN "module" TO "tool";
DROP INDEX IF EXISTS "Task_projectId_module_idx";
CREATE INDEX "Task_projectId_tool_idx" ON "Task"("projectId", "tool");

-- ProjectCustomSkill → ProjectTool
ALTER TABLE "ProjectCustomSkill" RENAME TO "ProjectTool";
ALTER TABLE "ProjectTool" RENAME CONSTRAINT "ProjectCustomSkill_pkey" TO "ProjectTool_pkey";
ALTER INDEX "ProjectCustomSkill_projectId_slug_key" RENAME TO "ProjectTool_projectId_slug_key";
ALTER TABLE "ProjectTool" RENAME CONSTRAINT "ProjectCustomSkill_projectId_fkey" TO "ProjectTool_projectId_fkey";
DROP INDEX IF EXISTS "ProjectCustomSkill_projectId_idx";
CREATE INDEX "ProjectTool_projectId_idx" ON "ProjectTool"("projectId");

-- ProjectMemoryReflection.skillSuggestions → toolSuggestions
ALTER TABLE "ProjectMemoryReflection" RENAME COLUMN "skillSuggestions" TO "toolSuggestions";
