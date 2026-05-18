-- AlterTable
ALTER TABLE "ClaudeFileEvaluation"
  ADD COLUMN "globalPolicyHash" TEXT,
  ADD COLUMN "globalPolicyProblem" TEXT,
  ADD COLUMN "globalPolicyAgentCommand" TEXT;
