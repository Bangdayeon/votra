import { NextResponse } from "next/server";

import { createTool } from "@/application/createTool";
import { listTools } from "@/application/listTools";
import { resolveUserFromApiKey } from "@/infrastructure/auth/resolveUserFromApiKey";
import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

export async function GET(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (projectId) {
    const [projectTools, globalTools] = await Promise.all([
      prismaToolRepository.listByProject(projectId),
      prismaToolRepository.listGlobal(user.id),
    ]);
    const globalSlugs = new Set(globalTools.map((t) => t.slug));
    const merged = [...globalTools, ...projectTools.filter((t) => !globalSlugs.has(t.slug))];
    merged.sort((a, b) => a.folder.localeCompare(b.folder) || a.createdAt.getTime() - b.createdAt.getTime());
    return NextResponse.json({ ok: true, tools: merged });
  }

  const result = await listTools(user.id, { tools: prismaToolRepository });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, tools: result.value });
}

export async function POST(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.description || !body?.folder || !body?.content) {
    return NextResponse.json({ ok: false, error: "name, description, folder, content가 필요해요." }, { status: 400 });
  }

  const result = await createTool(
    {
      userId: user.id,
      projectId: typeof body.projectId === "string" ? body.projectId : undefined,
      name: body.name as string,
      description: body.description as string,
      folder: body.folder as string,
      content: body.content as string,
      patternSummary: typeof body.patternSummary === "string" ? body.patternSummary : undefined,
      contextHint: typeof body.contextHint === "string" ? body.contextHint : undefined,
    },
    { tools: prismaToolRepository },
  );
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, tool: result.value });
}

export async function PATCH(req: Request) {
  const user = await resolveUserFromApiKey(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ ok: false, error: "인증이 필요해요." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id가 필요해요." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (typeof body?.isEnabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "isEnabled 값이 필요해요." }, { status: 400 });
  }

  await prismaToolRepository.setEnabled(id, body.isEnabled as boolean);
  return NextResponse.json({ ok: true, id, isEnabled: body.isEnabled });
}
