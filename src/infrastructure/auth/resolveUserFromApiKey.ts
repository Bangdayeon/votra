import "server-only";

import { prisma } from "@/infrastructure/db/prisma";
import { hashApiKeySecret } from "@/infrastructure/auth/hashApiKeySecret";

export async function resolveUserFromApiKey(
  authorizationHeader: string | null,
): Promise<{ id: string } | null> {
  const plaintext = extractBearer(authorizationHeader);
  if (!plaintext) return null;

  const hashed = hashApiKeySecret(plaintext);
  const key = await prisma.apiKey.findUnique({
    where: { hashedSecret: hashed },
    select: { id: true, userId: true },
  });
  if (!key) return null;

  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return { id: key.userId };
}

function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}
