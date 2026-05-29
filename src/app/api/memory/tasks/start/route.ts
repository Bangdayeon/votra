import { NextResponse } from "next/server";

import { listSkills } from "@/application/listSkills";
import { startTask } from "@/application/startTask";
import { matchSkillsToTask } from "@/domain/memory/matchSkillsToTask";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { emitProjectUpdate } from "@/infrastructure/events/projectEventBus";
import { prismaSkillRepository } from "@/infrastructure/repositories/prismaSkillRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export async function POST(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 파싱 실패." }, { status: 400 });
  }

  if (!isRecord(body)) return NextResponse.json({ ok: false, error: "body가 객체가 아니에요." }, { status: 400 });
  if (typeof body.projectId !== "string" || !body.projectId) {
    return NextResponse.json({ ok: false, error: "projectId가 필요해요." }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title) {
    return NextResponse.json({ ok: false, error: "title이 필요해요." }, { status: 400 });
  }

  const result = await startTask(
    {
      title: body.title,
      description: typeof body.description === "string" ? body.description : undefined,
      module: typeof body.module === "string" ? body.module : undefined,
      priority: typeof body.priority === "number" ? body.priority : undefined,
      folderId: typeof body.folderId === "string" ? body.folderId : undefined,
      projectId: body.projectId,
      userId: user.id,
    },
    { tasks: prismaTaskRepository },
  );

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  emitProjectUpdate(body.projectId);

  const skillsResult = await listSkills(body.projectId, { skills: prismaSkillRepository });
  const enabledSkills = skillsResult.ok ? skillsResult.value.filter((s) => s.enabled) : [];
  const matchedSkills = matchSkillsToTask(
    { title: result.value.title, module: result.value.module },
    enabledSkills,
  ).map((s) => ({ slug: s.slug, name: s.name, contextHint: s.contextHint }));

  return NextResponse.json({ ok: true, task: result.value, matchedSkills });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
