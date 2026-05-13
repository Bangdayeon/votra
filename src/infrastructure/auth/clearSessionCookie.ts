import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/infrastructure/auth/sessionConfig";

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
