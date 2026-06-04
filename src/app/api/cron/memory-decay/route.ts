import { NextResponse } from "next/server";

import { decayProjectMemory } from "@/application/decayProjectMemory";
import { prisma } from "@/infrastructure/db/prisma";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const projects = await prisma.project.findMany({ select: { id: true, settings: true } });

  const results = await Promise.allSettled(
    projects.map(async (p) => {
      const settings = parseProjectSettings(p.settings);
      return decayProjectMemory(p.id, settings.memory, { tasks: prismaTaskRepository });
    }),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  const totalStats = results
    .filter((r) => r.status === "fulfilled")
    .reduce(
      (acc, r) => {
        const v = (r as PromiseFulfilledResult<{ archived: number; trashed: number; promoted: number }>).value;
        acc.archived += v.archived;
        acc.trashed += v.trashed;
        acc.promoted += v.promoted;
        return acc;
      },
      { archived: 0, trashed: 0, promoted: 0 },
    );

  return NextResponse.json({ ok: true, succeeded, failed, ...totalStats });
}
