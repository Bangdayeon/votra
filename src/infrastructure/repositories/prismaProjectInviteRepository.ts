import "server-only";

import type {
  ProjectInviteRepository,
  ProjectInviteRow,
} from "@/application/ports/projectInviteRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaProjectInviteRepository: ProjectInviteRepository = {
  create: async ({ token, email, projectId, invitedById, expiresAt }) => {
    const row = await prisma.projectInvite.create({
      data: { token, email, projectId, invitedById, expiresAt },
      select: { id: true },
    });
    return row.id;
  },

  findByToken: async (token) => {
    const row = await prisma.projectInvite.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        projectId: true,
        invitedById: true,
        createdAt: true,
        project: { select: { title: true } },
        invitedBy: { select: { name: true } },
      },
    });
    if (!row) return null;
    return toRow(row);
  },

  accept: async ({ token, acceptedById }) => {
    const invite = await prisma.projectInvite.update({
      where: { token },
      data: { acceptedAt: new Date(), acceptedById },
      select: { projectId: true, project: { select: { title: true } } },
    });

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: invite.projectId, userId: acceptedById },
      },
      create: { projectId: invite.projectId, userId: acceptedById, role: "MEMBER" as const },
      update: {},
    });

    return { projectId: invite.projectId, projectTitle: invite.project.title };
  },

  listByProject: async (projectId) => {
    const rows = await prisma.projectInvite.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        email: true,
        expiresAt: true,
        acceptedAt: true,
        projectId: true,
        invitedById: true,
        createdAt: true,
        project: { select: { title: true } },
        invitedBy: { select: { name: true } },
      },
    });
    return rows.map(toRow);
  },

  deleteExpired: async (projectId) => {
    await prisma.projectInvite.deleteMany({
      where: { projectId, expiresAt: { lt: new Date() }, acceptedAt: null },
    });
  },
};

type RawRow = {
  id: string;
  token: string;
  email: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  projectId: string;
  invitedById: string;
  createdAt: Date;
  project: { title: string };
  invitedBy: { name: string | null };
};

function toRow(row: RawRow): ProjectInviteRow {
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    projectId: row.projectId,
    projectTitle: row.project.title,
    invitedById: row.invitedById,
    invitedByName: row.invitedBy.name,
    createdAt: row.createdAt,
  };
}
