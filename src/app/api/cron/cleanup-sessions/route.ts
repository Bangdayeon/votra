import { NextResponse } from "next/server";

import { prismaSessionLogRepository } from "@/infrastructure/repositories/prismaSessionLogRepository";

const RETENTION_DAYS = 90;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const before = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await prismaSessionLogRepository.deleteOld(before);

  return NextResponse.json({ ok: true, deleted });
}
