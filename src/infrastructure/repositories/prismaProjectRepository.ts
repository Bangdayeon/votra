import "server-only";

import { Prisma } from "@prisma/client";

import type {
  IngestEventInput,
  ProjectEventCreate,
  ProjectListRow,
  ProjectMemberRow,
  ProjectRepository,
} from "@/application/ports/projectRepository";
import { prisma } from "@/infrastructure/db/prisma";

function buildEventMetadata(
  e: ProjectEventCreate,
): Prisma.InputJsonValue | undefined {
  const meta: Record<string, unknown> = {};
  if (e.path) meta.path = e.path;
  if (e.toolName) meta.toolName = e.toolName;
  if (e.toolInput !== undefined) meta.toolInput = e.toolInput;
  if (e.errorType) meta.errorType = e.errorType;
  if (e.isError) meta.isError = true;
  if (e.uuid) meta.uuid = e.uuid;
  if (e.parentUuid) meta.parentUuid = e.parentUuid;
  return Object.keys(meta).length > 0
    ? (meta as Prisma.InputJsonValue)
    : undefined;
}

export const prismaProjectRepository: ProjectRepository = {
  list: async ({ userId }) => {
    const rows = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        agents: { take: 1 },
        members: { where: { userId }, select: { role: true } },
      },
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
        memberRole: r.members[0]?.role ?? null,
      }),
    );
  },

  create: async (data) => {
    const source = data.agent;
    const project = await prisma.project.create({
      data: {
        title: data.title,
        ownerId: data.ownerId,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        structure: data.structure as Prisma.InputJsonValue | undefined,
        cwd: data.cwd,
        agents: { create: [{ source }] },
        members: { create: [{ userId: data.ownerId, role: "OWNER" }] },
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
    if (input.settings !== undefined) {
      data.settings =
        input.settings === null
          ? Prisma.JsonNull
          : (input.settings as Prisma.InputJsonValue);
    }
    if (input.aiSpecGuideline !== undefined) {
      data.aiSpecGuideline = input.aiSpecGuideline;
    }
    if (input.aiSpecFile !== undefined) {
      if (input.aiSpecFile === null) {
        data.aiSpecFileName = null;
        data.aiSpecFileContent = null;
      } else {
        data.aiSpecFileName = input.aiSpecFile.name;
        data.aiSpecFileContent = input.aiSpecFile.content;
      }
    }
    if (input.agentContextFlowPrompt !== undefined) {
      data.agentContextFlowPrompt = input.agentContextFlowPrompt ?? null;
    }
    await prisma.project.update({ where: { id: input.id }, data });
  },

  delete: async (id) => {
    await prisma.project.delete({ where: { id } });
  },

  findMemberRole: async ({ projectId, userId }) => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project) return null;
    if (project.ownerId === userId) return "OWNER";
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    return (member?.role as "OWNER" | "MEMBER") ?? null;
  },

  countOwners: async (projectId) => {
    return prisma.projectMember.count({
      where: { projectId, role: "OWNER" },
    });
  },

  updateMemberRole: async ({ projectId, targetUserId, newRole }) => {
    await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      data: { role: newRole },
    });
  },

  removeMember: async ({ projectId, targetUserId }) => {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
  },

  findMembers: async (projectId) => {
    const rows = await prisma.projectMember.findMany({
      where: { projectId },
      select: {
        role: true,
        joinedAt: true,
        user: {
          select: { id: true, name: true, email: true, profileColor: true, profileImage: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    return rows.map(
      (m): ProjectMemberRow => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        profileColor: m.user.profileColor,
        profileImage: m.user.profileImage,
        role: m.role as "OWNER" | "MEMBER",
        joinedAt: m.joinedAt,
      }),
    );
  },

  findSettings: async (id) => {
    const row = await prisma.project.findUnique({
      where: { id },
      select: {
        settings: true,
        aiSpecGuideline: true,
        aiSpecFileName: true,
        agentContextFlowPrompt: true,
      },
    });
    return {
      settings: row?.settings ?? null,
      aiSpecGuideline: row?.aiSpecGuideline ?? null,
      aiSpecFileName: row?.aiSpecFileName ?? null,
      agentContextFlowPrompt: row?.agentContextFlowPrompt ?? null,
    };
  },

  findOwnerAiPolicy: async (id) => {
    const row = await prisma.project.findUnique({
      where: { id },
      select: {
        owner: { select: { aiPolicyText: true, aiPolicyFileContent: true } },
      },
    });
    if (!row?.owner) return null;
    const text = row.owner.aiPolicyText ?? "";
    const fileContent = row.owner.aiPolicyFileContent ?? null;
    if (text.length === 0 && fileContent === null) return null;
    return { text, fileContent };
  },

  findByCwd: async ({ cwd, ownerId }) => {
    const row = await prisma.project.findFirst({
      where: {
        cwd,
        OR: [{ ownerId }, { members: { some: { userId: ownerId } } }],
      },
      select: { id: true, ownerId: true },
      orderBy: { createdAt: "desc" },
    });
    return row ?? null;
  },

  createForIngest: async ({ cwd, title, ownerId, agent }) => {
    const project = await prisma.project.create({
      data: {
        title,
        ownerId,
        cwd,
        agents: { create: [{ source: agent }] },
        members: { create: [{ userId: ownerId, role: "OWNER" }] },
      },
      select: { id: true, ownerId: true },
    });
    return project;
  },

  upsertIngestSession: async ({ projectId, agent, session }) => {
    const source = agent;
    const row = await prisma.session.upsert({
      where: {
        projectId_externalId: { projectId, externalId: session.externalId },
      },
      create: {
        projectId,
        externalId: session.externalId,
        source,
        model: session.model ?? "unknown",
        title: session.title,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        tokenUsage: { create: {} },
      },
      update: {
        source,
        title: session.title ?? undefined,
        // model 이 null 이면 (부분 payload) 기존 값 보존
        model: session.model ?? undefined,
        // 시작 시각은 첫 ingest 값을 유지, 종료 시각은 가장 최신으로 갱신
        endedAt: session.endedAt ?? undefined,
      },
      select: { id: true },
    });
    return row.id;
  },

  findExistingEventUuids: async (sessionId, uuids) => {
    if (uuids.length === 0) return new Set();
    const rows = await prisma.event.findMany({
      where: { sessionId, externalUuid: { in: uuids } },
      select: { externalUuid: true },
    });
    const set = new Set<string>();
    for (const r of rows) if (r.externalUuid) set.add(r.externalUuid);
    return set;
  },

  appendEvents: async (sessionId, events) => {
    if (events.length === 0) return 0;
    const result = await prisma.event.createMany({
      data: events.map((e) => toEventCreateData(sessionId, e)),
      skipDuplicates: true,
    });
    return result.count;
  },

  addTokenUsage: async (sessionId, delta) => {
    if (delta.inputTokens === 0 && delta.outputTokens === 0) return;
    const total = delta.inputTokens + delta.outputTokens;
    await prisma.sessionTokenUsage.upsert({
      where: { sessionId },
      create: {
        sessionId,
        inputTokens: delta.inputTokens,
        outputTokens: delta.outputTokens,
        totalTokens: total,
      },
      update: {
        inputTokens: { increment: delta.inputTokens },
        outputTokens: { increment: delta.outputTokens },
        totalTokens: { increment: total },
      },
    });
  },
};

function toEventCreateData(
  sessionId: string,
  e: IngestEventInput,
): Prisma.EventCreateManyInput {
  return {
    sessionId,
    type: e.type,
    role: e.role,
    content: e.content,
    timestamp: e.occurredAt,
    metadata: buildEventMetadata(e),
    externalUuid: e.uuid ?? null,
  };
}
