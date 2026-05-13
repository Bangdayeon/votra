"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/infrastructure/db/prisma";
import { setSessionCookie } from "@/infrastructure/auth/setSessionCookie";
import { randomProfileAppearance } from "@/domain/user/profileAppearance";

export type AxhubSignInState = { error?: string };

/**
 * axhub 사용자 정체성을 흡수해 로컬 User 와 매칭/생성하고 세션을 만듭니다.
 *
 * axhub 가 어떤 방식으로 사용자 정보를 노출하는지에 따라 아래 우선순위로 검사해요:
 *   1. 리버스 프록시가 주입한 헤더 (`x-apphub-user-id` / `x-apphub-user-email`,
 *      혹은 `x-axhub-user-*`)
 *   2. axhub /api/v1/me 호출 (브라우저 쿠키 전달)
 *
 * 환경에서 둘 다 못 잡으면 명시적 에러를 반환합니다.
 */
export async function signInWithAxhubAction(): Promise<AxhubSignInState> {
  const h = await headers();
  let axhubUserId =
    h.get("x-apphub-user-id") || h.get("x-axhub-user-id") || null;
  let axhubEmail =
    h.get("x-apphub-user-email") || h.get("x-axhub-user-email") || null;
  let axhubName =
    h.get("x-apphub-user-name") || h.get("x-axhub-user-name") || null;

  // 헤더가 없으면 /api/v1/me 폴백
  if (!axhubUserId || !axhubEmail) {
    try {
      const cookie = h.get("cookie") ?? "";
      const apiBase =
        process.env.AXHUB_API_URL ?? "https://hub-api.jocodingax.ai";
      const res = await fetch(`${apiBase}/api/v1/me`, {
        headers: { cookie },
        cache: "no-store",
      });
      if (res.ok) {
        const me = (await res.json()) as {
          id?: number | string;
          email?: string;
          name?: string;
        };
        axhubUserId = axhubUserId ?? (me.id != null ? String(me.id) : null);
        axhubEmail = axhubEmail ?? me.email ?? null;
        axhubName = axhubName ?? me.name ?? null;
      }
    } catch {
      // fallback 실패는 무시하고 아래에서 에러 처리
    }
  }

  if (!axhubUserId || !axhubEmail) {
    return {
      error:
        "axhub 사용자 정보를 가져오지 못했어요. axhub 에 먼저 로그인했는지 확인해 주세요.",
    };
  }

  const randomAppearance = randomProfileAppearance();
  const user = await prisma.user.upsert({
    where: { axhubUserId },
    update: { email: axhubEmail, name: axhubName ?? undefined },
    create: {
      axhubUserId,
      email: axhubEmail,
      name: axhubName,
      profileColor: randomAppearance.profileColor,
      profileImage: randomAppearance.profileImage,
    },
    select: { id: true },
  });

  await setSessionCookie(user.id);
  redirect("/");
}
