import "server-only";

import { Prisma, type AgentSource } from "@prisma/client";

import { prisma } from "@/infrastructure/db/prisma";
import type { Session } from "@/domain/session/types";

import { aggregateSessionMetrics } from "./aggregateSessionMetrics";

const DEFAULT_USER_EMAIL = "default@votra.local";

export type SaveProjectInput = {
  title: string;
  agent: AgentSource;
  /** `Project.structure` 에 그대로 저장될 JSON (예: { tree: FolderNode[] }) */
  structure?: Record<string, unknown>;
  /** 썸네일 (data URL 또는 외부 URL). DB `Project.thumbnailUrl` */
  thumbnailUrl?: string;
  sessions: Session[];
};

export async function saveProject(input: SaveProjectInput): Promise<string> {
  const owner = await getOrCreateDefaultUser();

  const project = await prisma.project.create({
    data: {
      title: input.title,
      ownerId: owner.id,
      thumbnailUrl: input.thumbnailUrl,
      structure: input.structure as Prisma.InputJsonValue | undefined,
      agents: { create: [{ source: input.agent }] },
      sessions: {
        create: input.sessions.map((session) => buildSessionCreate(session, input.agent)),
      },
    },
    select: { id: true },
  });

  return project.id;
}

function buildSessionCreate(session: Session, source: AgentSource) {
  const metrics = aggregateSessionMetrics(session.events);
  return {
    title: session.title,
    source,
    model: metrics.model ?? "unknown",
    startedAt: parseDate(session.startedAt),
    endedAt: parseDate(session.endedAt),
    tokenUsage: {
      create: {
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        totalTokens: metrics.totalTokens,
      },
    },
  };
}

function parseDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

async function getOrCreateDefaultUser() {
  const existing = await prisma.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });
  if (existing) return existing;
  return prisma.user.create({
    data: { email: DEFAULT_USER_EMAIL, name: "default" },
  });
}
