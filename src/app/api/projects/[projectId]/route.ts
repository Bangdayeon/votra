import { NextResponse } from "next/server";

import { getProjectSettings } from "@/application/getProjectSettings";
import {
  updateProjectSettings,
  type AiSpecFileInput,
} from "@/application/updateProjectSettings";
import { AI_SPEC_GUIDELINE_MAX } from "@/domain/aiSpec/types";
import { parseAiSpecFilePayload } from "@/domain/aiSpec/parseAiSpecFilePayload";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const { projectId } = await ctx.params;
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error },
      { status: 403 },
    );
  }
  const bundle = await getProjectSettings(projectId, {
    projects: prismaProjectRepository,
  });
  return NextResponse.json({
    ok: true,
    settings: bundle.settings,
    aiSpecGuideline: bundle.aiSpecGuideline,
    aiSpecFileName: bundle.aiSpecFileName,
  });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const { projectId } = await ctx.params;
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON 파싱에 실패했어요." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { ok: false, error: "body 가 객체가 아니에요." },
      { status: 400 },
    );
  }

  const hasSettings = body.settings !== undefined;
  const hasGuideline = body.aiSpecGuideline !== undefined;
  const hasFile = body.aiSpecFile !== undefined;
  if (!hasSettings && !hasGuideline && !hasFile) {
    return NextResponse.json(
      { ok: false, error: "변경할 항목이 없어요." },
      { status: 400 },
    );
  }

  let guideline: string | undefined;
  if (hasGuideline) {
    if (typeof body.aiSpecGuideline !== "string") {
      return NextResponse.json(
        { ok: false, error: "aiSpecGuideline 은 문자열이어야 해요." },
        { status: 400 },
      );
    }
    if (body.aiSpecGuideline.length > AI_SPEC_GUIDELINE_MAX) {
      return NextResponse.json(
        { ok: false, error: "지침이 너무 길어요." },
        { status: 400 },
      );
    }
    guideline = body.aiSpecGuideline;
  }

  let file: AiSpecFileInput | null | undefined;
  if (hasFile) {
    const parsed = parseAiSpecFilePayload(body.aiSpecFile);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: parsed.error },
        { status: 400 },
      );
    }
    file = parsed.value;
  }

  await updateProjectSettings(
    {
      id: projectId,
      settings: hasSettings ? parseProjectSettings(body.settings) : undefined,
      aiSpecGuideline: guideline,
      aiSpecFile: file,
    },
    { projects: prismaProjectRepository },
  );

  const bundle = await getProjectSettings(projectId, {
    projects: prismaProjectRepository,
  });
  return NextResponse.json({
    ok: true,
    settings: bundle.settings,
    aiSpecGuideline: bundle.aiSpecGuideline,
    aiSpecFileName: bundle.aiSpecFileName,
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
