import "server-only";

import { Prisma } from "@prisma/client";

import type {
  ProjectListRow,
  ProjectMemberRow,
  ProjectRepository,
} from "@/application/ports/projectRepository";
import { prisma } from "@/infrastructure/db/prisma";

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
        lastCliSyncAt: null,
      }),
    );
  },

  create: async (data) => {
    const project = await prisma.project.create({
      data: {
        title: data.title,
        ownerId: data.ownerId,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        structure: data.structure as Prisma.InputJsonValue | undefined,
        cwd: data.cwd,
        members: { create: [{ userId: data.ownerId, role: "OWNER" }] },
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
};
