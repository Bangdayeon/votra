import { NextResponse } from "next/server";

import { listCommands } from "@/application/listCommands";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const result = await listCommands(user.id, { commands: prismaCommandRepository });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, commands: result.value });
}
