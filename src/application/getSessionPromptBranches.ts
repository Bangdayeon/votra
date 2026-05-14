import type { SessionRepository } from "@/application/ports/sessionRepository";
import {
  buildPromptBranches,
  type PromptBranch,
} from "@/domain/session/buildPromptBranches";

export type {
  AiActionKind,
  AiActionNode,
  PromptBranch,
} from "@/domain/session/buildPromptBranches";

export async function getSessionPromptBranches(
  sessionId: string,
  deps: { sessions: SessionRepository },
): Promise<PromptBranch[]> {
  const events = await deps.sessions.findEventsBySession(sessionId);
  return buildPromptBranches(events);
}
