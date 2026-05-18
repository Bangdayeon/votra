import "server-only";

import { Prisma } from "@prisma/client";

import type {
  ClaudeFileEvaluationRepository,
  ClaudeFileEvaluationRow,
} from "@/application/ports/claudeFileEvaluationRepository";
import type {
  AiScores,
  ClaudeFileEvaluationStatus,
  ClaudeFileSeverity,
  GlobalPolicyViolation,
} from "@/domain/claudeFiles/types";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaClaudeFileEvaluationRepository: ClaudeFileEvaluationRepository =
  {
    findByProject: async (projectId) => {
      const rows = await prisma.claudeFileEvaluation.findMany({
        where: { projectId },
      });
      return rows.map(
        (r): ClaudeFileEvaluationRow => ({
          absPath: r.absPath,
          status: r.status as ClaudeFileEvaluationStatus,
          severity: (r.severity as ClaudeFileSeverity | null) ?? null,
          errorMessage: r.errorMessage,
          aiReason: r.aiReason,
          scores: parseScores(r.scoresJson),
          criteria: {
            basic: r.basedOnBasic,
            project: r.basedOnProject,
            team: r.basedOnTeam,
          },
          globalPolicyHash: r.globalPolicyHash,
          globalPolicyViolation: toViolation(
            r.globalPolicyProblem,
            r.globalPolicyAgentCommand,
          ),
          evaluatedAt: r.evaluatedAt ? r.evaluatedAt.getTime() : null,
        }),
      );
    },

    upsertMany: async (rows) => {
      if (rows.length === 0) return;
      await prisma.$transaction(
        rows.map((r) =>
          prisma.claudeFileEvaluation.upsert({
            where: {
              projectId_absPath: {
                projectId: r.projectId,
                absPath: r.absPath,
              },
            },
            create: {
              projectId: r.projectId,
              absPath: r.absPath,
              status: r.status,
              severity: r.severity,
              errorMessage: r.errorMessage,
              aiReason: r.aiReason,
              scoresJson:
                r.scores === null
                  ? Prisma.JsonNull
                  : (r.scores as Prisma.InputJsonValue),
              basedOnBasic: r.criteria.basic,
              basedOnProject: r.criteria.project,
              basedOnTeam: r.criteria.team,
              globalPolicyHash: r.globalPolicyHash,
              globalPolicyProblem: r.globalPolicyViolation?.problem ?? null,
              globalPolicyAgentCommand:
                r.globalPolicyViolation?.agentCommand ?? null,
              evaluatedAt: r.evaluatedAt ? new Date(r.evaluatedAt) : null,
            },
            update: {
              status: r.status,
              severity: r.severity,
              errorMessage: r.errorMessage,
              aiReason: r.aiReason,
              scoresJson:
                r.scores === null
                  ? Prisma.JsonNull
                  : (r.scores as Prisma.InputJsonValue),
              basedOnBasic: r.criteria.basic,
              basedOnProject: r.criteria.project,
              basedOnTeam: r.criteria.team,
              globalPolicyHash: r.globalPolicyHash,
              globalPolicyProblem: r.globalPolicyViolation?.problem ?? null,
              globalPolicyAgentCommand:
                r.globalPolicyViolation?.agentCommand ?? null,
              evaluatedAt: r.evaluatedAt ? new Date(r.evaluatedAt) : null,
            },
          }),
        ),
      );
    },
  };

function toViolation(
  problem: string | null,
  agentCommand: string | null,
): GlobalPolicyViolation | null {
  if (!problem || !agentCommand) return null;
  return { problem, agentCommand };
}

function parseScores(raw: unknown): AiScores | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const out: AiScores = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}
