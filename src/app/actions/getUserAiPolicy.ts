"use server";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prisma } from "@/infrastructure/db/prisma";

export type UserAiPolicyBundle = {
  aiSpecGuideline: string;
  aiSpecFileName: string | null;
};

export async function getUserAiPolicyAction(): Promise<
  { ok: true; policy: UserAiPolicyBundle } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { aiPolicyText: true, aiPolicyFileName: true },
  });

  return {
    ok: true,
    policy: {
      aiSpecGuideline: row?.aiPolicyText ?? "",
      aiSpecFileName: row?.aiPolicyFileName ?? null,
    },
  };
}
