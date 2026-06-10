import { NextResponse } from "next/server";

import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

// UI 휴지통(deletedAt): 12일 보존 후 영구 삭제
// AI 감쇠 TRASH(memoryTier=TRASH): 30일 보존 후 영구 삭제
const SOFT_DELETE_RETENTION_DAYS = 12;
const TRASH_TIER_RETENTION_DAYS = 30;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = new Date();
  const softDeleteBefore = new Date(now.getTime() - SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const trashTierBefore = new Date(now.getTime() - TRASH_TIER_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deleted = await prismaTaskRepository.purgeTrash({ softDeleteBefore, trashTierBefore });

  return NextResponse.json({ ok: true, deleted });
}
