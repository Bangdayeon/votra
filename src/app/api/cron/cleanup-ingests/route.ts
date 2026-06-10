import { NextResponse } from "next/server";

import { prismaExternalIngestRepository } from "@/infrastructure/repositories/prismaExternalIngestRepository";

// Retention policy:
//   processed records: delete after 30 days (already absorbed into tasks/context)
//   unprocessed records: delete after 7 days (stale, never acted on)
const PROCESSED_RETENTION_DAYS = 30;
const UNPROCESSED_RETENTION_DAYS = 7;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const processedBefore = new Date(now.getTime() - PROCESSED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const unprocessedBefore = new Date(now.getTime() - UNPROCESSED_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deleted = await prismaExternalIngestRepository.deleteOld({ processedBefore, unprocessedBefore });

  return NextResponse.json({ ok: true, deleted });
}
