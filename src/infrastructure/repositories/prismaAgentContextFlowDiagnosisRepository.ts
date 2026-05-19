import "server-only";

import type { AgentContextFlowDiagnosisRepository } from "@/application/ports/projectAgentContextFlowDiagnosisRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaAgentContextFlowDiagnosisRepository: AgentContextFlowDiagnosisRepository =
  {
    findByProject: async (projectId) => {
      const row = await prisma.projectAgentContextFlowDiagnosis.findUnique({
        where: { projectId },
      });
      if (!row) return null;
      return { result: row.result, refreshedAt: row.refreshedAt };
    },

    upsert: async ({ projectId, result }) => {
      const refreshedAt = new Date();
      const row = await prisma.projectAgentContextFlowDiagnosis.upsert({
        where: { projectId },
        create: { projectId, result, refreshedAt },
        update: { result, refreshedAt },
      });
      return { result: row.result, refreshedAt: row.refreshedAt };
    },
  };
