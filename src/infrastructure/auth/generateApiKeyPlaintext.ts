import "server-only";

import { randomBytes } from "node:crypto";

export function generateApiKeyPlaintext(): string {
  return `haema_${randomBytes(32).toString("hex")}`;
}
