import { NextResponse } from "next/server";

import { getProjectSettings } from "@/application/getProjectSettings";
import { updateProjectSettings } from "@/application/updateProjectSettings";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import { assertProjectOwner } from "@/infrastructure/auth/assertProjectOwner";
import { prismaPolicyRuleRepository } from "@/infrastructure/repositories/prismaPolicyRuleRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const { projectId } = await ctx.params;
  const guard = await assertProjectOwner(projectId);
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error },
      { status: 403 },
    );
  }
  const bundle = await getProjectSettings(projectId, {
    projects: prismaProjectRepository,
    policyRules: prismaPolicyRuleRepository,
  });
  return NextResponse.json({
    ok: true,
    settings: bundle.settings,
  });
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const { projectId } = await ctx.params;
  const guard = await assertProjectOwner(projectId);
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
  if (!hasSettings) {
    return NextResponse.json(
      { ok: false, error: "변경할 항목이 없어요." },
      { status: 400 },
    );
  }

  await updateProjectSettings(
    {
      id: projectId,
      settings: hasSettings ? parseProjectSettings(body.settings) : undefined,
    },
    { projects: prismaProjectRepository },
  );

  const bundle = await getProjectSettings(projectId, {
    projects: prismaProjectRepository,
    policyRules: prismaPolicyRuleRepository,
  });
  return NextResponse.json({
    ok: true,
    settings: bundle.settings,
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
