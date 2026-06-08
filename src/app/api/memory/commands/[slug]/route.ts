import { NextResponse } from "next/server";

import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaCommandRepository } from "@/infrastructure/repositories/prismaCommandRepository";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  const { slug } = await params;
  const command = await prismaCommandRepository.findBySlug(user.id, slug);
  if (!command) {
    return NextResponse.json({ ok: false, error: "커맨드를 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    slug: command.slug,
    name: command.name,
    description: command.description,
    content: command.content,
  });
}
