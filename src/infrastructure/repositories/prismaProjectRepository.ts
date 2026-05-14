import "server-only";

import { Prisma, type AgentSource } from "@prisma/client";

import type {
  ProjectEventCreate,
  ProjectListRow,
  ProjectRepository,
} from "@/application/ports/projectRepository";
import { prisma } from "@/infrastructure/db/prisma";

function buildEventMetadata(
  e: ProjectEventCreate,
): Prisma.InputJsonValue | undefined {
  const meta: Record<string, unknown> = {};
  if (e.path) meta.path = e.path;
  if (e.toolName) meta.toolName = e.toolName;
  if (e.errorType) meta.errorType = e.errorType;
  if (e.isError) meta.isError = true;
  if (e.uuid) meta.uuid = e.uuid;
  if (e.parentUuid) meta.parentUuid = e.parentUuid;
  return Object.keys(meta).length > 0
    ? (meta as Prisma.InputJsonValue)
    : undefined;
}

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
        cwd: r.cwd,
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
        cwd: data.cwd,
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
            events:
              s.events && s.events.length > 0
                ? {
                    create: s.events.map((e) => ({
                      type: e.type,
                      role: e.role,
                      content: e.content,
                      timestamp: e.occurredAt,
                      metadata: buildEventMetadata(e),
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
