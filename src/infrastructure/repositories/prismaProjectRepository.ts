import "server-only";

import { Prisma, type AgentSource } from "@prisma/client";

import type {
  ProjectListRow,
  ProjectRepository,
} from "@/application/ports/projectRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaProjectRepository: ProjectRepository = {
  list: async () => {
    const rows = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { agents: { take: 1 } },
    });
    return rows.map(
      (r): ProjectListRow => ({
        id: r.id,
        title: r.title,
        description: r.description,
        thumbnailUrl: r.thumbnailUrl,
        structure: r.structure,
        firstAgentSource: r.agents[0]?.source ?? null,
      }),
    );
  },

  create: async (data) => {
    const source = data.agent as AgentSource;
    const project = await prisma.project.create({
      data: {
        title: data.title,
        ownerId: data.ownerId,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        structure: data.structure as Prisma.InputJsonValue | undefined,
        agents: { create: [{ source }] },
        sessions: {
          create: data.sessions.map((s) => ({
            title: s.title,
            source,
            model: s.model,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            tokenUsage: {
              create: {
                inputTokens: s.inputTokens,
                outputTokens: s.outputTokens,
                totalTokens: s.totalTokens,
              },
            },
            errorFlows:
              s.errors && s.errors.length > 0
                ? {
                    create: s.errors.map((e) => ({
                      errorType: e.errorType,
                      errorMessage: e.errorMessage,
                      occurredAt: e.occurredAt,
                    })),
                  }
                : undefined,
          })),
        },
      },
      select: { id: true },
    });
    return project.id;
  },

  update: async (input) => {
    const data: Prisma.ProjectUpdateInput = {};
    if (input.title !== undefined && input.title.length > 0) {
      data.title = input.title;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.thumbnailUrl !== undefined) {
      data.thumbnailUrl = input.thumbnailUrl;
    }
    if (input.structure !== undefined) {
      data.structure =
        input.structure === null
          ? Prisma.JsonNull
          : (input.structure as Prisma.InputJsonValue);
    }
    await prisma.project.update({ where: { id: input.id }, data });
  },

  delete: async (id) => {
    await prisma.project.delete({ where: { id } });
  },
};
