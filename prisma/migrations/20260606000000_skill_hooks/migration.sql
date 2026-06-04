-- AlterTable: add hook fields to ProjectCustomSkill
ALTER TABLE "ProjectCustomSkill"
  ADD COLUMN "hookEvent"   TEXT,
  ADD COLUMN "hookMatcher" TEXT,
  ADD COLUMN "hookScript"  TEXT;
