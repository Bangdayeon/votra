import { NextResponse } from "next/server";

import { createCustomSkill } from "@/application/createCustomSkill";
import { listCustomSkills } from "@/application/listCustomSkills";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaCustomSkillRepository } from "@/infrastructure/repositories/prismaCustomSkillRepository";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });

  const result = await listCustomSkills(projectId, { customSkills: prismaCustomSkillRepository });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true, skills: result.value });
}

export async function POST(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.projectId || !body?.name || !body?.description || !body?.folder || !body?.content) {
    return NextResponse.json({ ok: false, error: "projectId, name, description, folder, content가 필요해요." }, { status: 400 });
  }

  const result = await createCustomSkill(
    {
      projectId: body.projectId as string,
      name: body.name as string,
      description: body.description as string,
      folder: body.folder as string,
      content: body.content as string,
      patternSummary: typeof body.patternSummary === "string" ? body.patternSummary : undefined,
      contextHint: typeof body.contextHint === "string" ? body.contextHint : undefined,
    },
    { customSkills: prismaCustomSkillRepository },
  );
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, skill: result.value });
}

export async function PATCH(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const slug = searchParams.get("slug");
  if (!projectId || !slug) return NextResponse.json({ ok: false, error: "projectId와 slug가 필요해요." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (typeof body?.isEnabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "isEnabled 값이 필요해요." }, { status: 400 });
  }

  await prismaCustomSkillRepository.setEnabled(projectId, slug, body.isEnabled as boolean);
  return NextResponse.json({ ok: true, slug, isEnabled: body.isEnabled });
}
