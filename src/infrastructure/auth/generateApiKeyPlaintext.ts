import "server-only";

import { randomBytes } from "node:crypto";

export function generateApiKeyPlaintext(): string {
  return `votra_${randomBytes(32).toString("hex")}`;
}
