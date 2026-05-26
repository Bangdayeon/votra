import { type NextRequest, NextResponse } from "next/server";

import { prisma } from "@/infrastructure/db/prisma";
import { signSessionJwt } from "@/infrastructure/auth/signSessionJwt";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
} from "@/infrastructure/auth/sessionConfig";
import { DEFAULT_AI_POLICY_TEXT } from "@/domain/aiSpec/types";
import { randomProfileAppearance } from "@/domain/user/profileAppearance";
import { safeNextPath } from "@/shared/lib/safeNextPath";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const origin = process.env.APP_URL ?? req.nextUrl.origin;
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  const cookieRaw = req.cookies.get("google_oauth_state")?.value;

  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(msg)}`, origin),
    );

  if (!code || !returnedState || !cookieRaw) return fail("잘못된 요청이에요.");

  let savedState: string;
  let next: string;
  try {
    const parsed = JSON.parse(cookieRaw) as { state: string; next: string };
    savedState = parsed.state;
    next = parsed.next;
  } catch {
    return fail("잘못된 요청이에요.");
  }

  if (returnedState !== savedState) return fail("인증 요청이 만료됐어요.");

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const callbackUrl = `${origin}/api/auth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) return fail("Google 인증에 실패했어요.");

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });

  if (!userRes.ok) return fail("Google 사용자 정보를 가져오지 못했어요.");

  const googleUser = (await userRes.json()) as GoogleUserInfo;

  if (!googleUser.email || !googleUser.id) return fail("Google 계정 정보를 가져오지 못했어요.");

  // googleId로 찾거나, 같은 이메일 계정에 googleId를 연결하거나, 새로 생성
  let user = await prisma.user.findUnique({
    where: { googleId: googleUser.id },
    select: { id: true },
  });

  if (!user) {
    const byEmail = await prisma.user.findUnique({
      where: { email: googleUser.email },
      select: { id: true },
    });

    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: googleUser.id, name: googleUser.name ?? undefined },
        select: { id: true },
      });
    } else {
      const randomAppearance = randomProfileAppearance();
      user = await prisma.user.create({
        data: {
          googleId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          profileColor: randomAppearance.profileColor,
          profileImage: randomAppearance.profileImage,
          aiPolicyText: DEFAULT_AI_POLICY_TEXT,
        },
        select: { id: true },
      });
    }
  }

  const jwt = await signSessionJwt({ userId: user.id });
  const res = NextResponse.redirect(new URL(safeNextPath(next), origin));
  res.cookies.set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  res.cookies.delete("google_oauth_state");
  return res;
}
