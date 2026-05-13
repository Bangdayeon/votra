import type { Session } from "./types";

export function extractCwd(sessions: Session[]): string | null {
  for (const session of sessions) {
    for (const event of session.events) {
      if (typeof event.cwd === "string" && event.cwd.length > 0) {
        return event.cwd;
      }
    }
  }
  return null;
}
