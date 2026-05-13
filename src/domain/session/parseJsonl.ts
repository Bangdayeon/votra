import { buildSession } from "./buildSession";
import { groupBySessionId } from "./groupBySessionId";
import { parseLine } from "./parseLine";
import type { RawEvent, Session } from "./types";

export function parseJsonl(text: string): Session[] {
  const events: RawEvent[] = [];
  for (const line of text.split("\n")) {
    const event = parseLine(line);
    if (event) events.push(event);
  }

  const groups = groupBySessionId(events);
  const sessions: Session[] = [];
  for (const [id, sessionEvents] of groups) {
    sessions.push(buildSession(id, sessionEvents));
  }
  sessions.sort(byStartedAt);
  return sessions;
}

function byStartedAt(a: Session, b: Session): number {
  return (a.startedAt ?? "").localeCompare(b.startedAt ?? "");
}
