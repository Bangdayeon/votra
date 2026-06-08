import { NextResponse } from "next/server";

import { createCommand } from "@/application/createCommand";
import { listCommands } from "@/application/listCommands";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const result = await listCommands(user.id, { commands: prismaCommandRepository });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true, commands: result.value });
}

export async function POST(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.description || !body?.folder || !body?.content) {
    return NextResponse.json({ ok: false, error: "name, description, folder, content가 필요해요." }, { status: 400 });
  }

  const result = await createCommand(
    {
      userId: user.id,
      name: body.name as string,
      description: body.description as string,
      folder: body.folder as string,
      content: body.content as string,
    },
    { commands: prismaCommandRepository },
  );
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, command: result.value });
}
