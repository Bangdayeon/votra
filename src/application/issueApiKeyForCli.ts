import "server-only";

import { generateApiKeyPlaintext } from "@/infrastructure/auth/generateApiKeyPlaintext";
import { hashApiKeySecret } from "@/infrastructure/auth/hashApiKeySecret";
import { prisma } from "@/infrastructure/db/prisma";

export async function issueApiKeyForCli(input: {
  userId: string;
  name: string;
}): Promise<string> {
  const plaintext = generateApiKeyPlaintext();
  await prisma.apiKey.create({
    data: {
      userId: input.userId,
      name: input.name,
      hashedSecret: hashApiKeySecret(plaintext),
    },
  });
  return plaintext;
}
