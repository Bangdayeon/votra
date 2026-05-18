import "server-only";

import type {
  ClaudeFileEvaluationRepository,
  ClaudeFileEvaluationRow,
} from "@/application/ports/claudeFileEvaluationRepository";
import type {
  ClaudeFileEvaluationStatus,
  ClaudeFileSeverity,
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
          criteria: {
            basic: r.basedOnBasic,
            project: r.basedOnProject,
            team: r.basedOnTeam,
          },
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
              basedOnBasic: r.criteria.basic,
              basedOnProject: r.criteria.project,
              basedOnTeam: r.criteria.team,
              evaluatedAt: r.evaluatedAt ? new Date(r.evaluatedAt) : null,
            },
            update: {
              status: r.status,
              severity: r.severity,
              errorMessage: r.errorMessage,
              basedOnBasic: r.criteria.basic,
              basedOnProject: r.criteria.project,
              basedOnTeam: r.criteria.team,
              evaluatedAt: r.evaluatedAt ? new Date(r.evaluatedAt) : null,
            },
          }),
        ),
      );
    },
  };
