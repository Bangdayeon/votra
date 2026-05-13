import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/infrastructure/auth/sessionConfig";
import type { SessionPayload } from "@/infrastructure/auth/signSessionJwt";
import { verifySessionJwt } from "@/infrastructure/auth/verifySessionJwt";

export async function readSessionFromCookies(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionJwt(token);
}
