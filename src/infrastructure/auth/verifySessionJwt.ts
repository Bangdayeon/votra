import { jwtVerify } from "jose";

import { SESSION_JWT_ALG } from "@/infrastructure/auth/sessionConfig";
import { sessionSecret } from "@/infrastructure/auth/sessionSecret";
import type { SessionPayload } from "@/infrastructure/auth/signSessionJwt";

export async function verifySessionJwt(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: [SESSION_JWT_ALG],
    });
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}
