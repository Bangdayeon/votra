import { SignJWT } from "jose";

import {
  SESSION_JWT_ALG,
  SESSION_MAX_AGE_SEC,
} from "@/infrastructure/auth/sessionConfig";
import { sessionSecret } from "@/infrastructure/auth/sessionSecret";

export type SessionPayload = {
  userId: string;
};

export async function signSessionJwt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ sub: payload.userId })
    .setProtectedHeader({ alg: SESSION_JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(sessionSecret());
}
