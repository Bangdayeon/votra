import { createHash } from "node:crypto";

export function hashApiKeySecret(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
