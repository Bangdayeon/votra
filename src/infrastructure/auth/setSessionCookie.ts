import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
} from "@/infrastructure/auth/sessionConfig";
import { signSessionJwt } from "@/infrastructure/auth/signSessionJwt";

export async function setSessionCookie(userId: string): Promise<void> {
  const jwt = await signSessionJwt({ userId });
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}
