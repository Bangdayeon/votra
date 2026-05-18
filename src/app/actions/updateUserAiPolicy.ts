"use server";

import { parseAiSpecFilePayload } from "@/domain/aiSpec/parseAiSpecFilePayload";
import {
  AI_SPEC_GUIDELINE_MAX,
  type AiSpecPolicyPatch,
} from "@/domain/aiSpec/types";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prisma } from "@/infrastructure/db/prisma";

export type UpdateUserAiPolicyInput = AiSpecPolicyPatch;

export async function updateUserAiPolicyAction(
  input: UpdateUserAiPolicyInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  if (typeof input.aiSpecGuideline !== "string") {
    return { ok: false, error: "정책 본문은 문자열이어야 해요." };
  }
  if (input.aiSpecGuideline.length > AI_SPEC_GUIDELINE_MAX) {
    return {
      ok: false,
      error: `정책 본문은 ${AI_SPEC_GUIDELINE_MAX}자를 넘을 수 없어요.`,
    };
  }

  const data: {
    aiPolicyText: string;
    aiPolicyFileName?: string | null;
    aiPolicyFileContent?: string | null;
  } = { aiPolicyText: input.aiSpecGuideline };

  if (input.aiSpecFile !== undefined) {
    const parsed = parseAiSpecFilePayload(input.aiSpecFile);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    if (parsed.value === null) {
      data.aiPolicyFileName = null;
      data.aiPolicyFileContent = null;
    } else {
      data.aiPolicyFileName = parsed.value.name;
      data.aiPolicyFileContent = parsed.value.content;
    }
  }

  await prisma.user.update({ where: { id: user.id }, data });
  return { ok: true };
}
