import { aggregateSessionMetrics } from "@/domain/session/aggregateSessionMetrics";
import { extractErrors } from "@/domain/session/extractErrors";
import { extractTimeline } from "@/domain/session/extractTimeline";
import type { AgentKind } from "@/domain/agent/types";
import type { Session } from "@/domain/session/types";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { UserRepository } from "@/application/ports/userRepository";

const DEFAULT_USER_EMAIL = "default@votra.local";

export type SaveProjectInput = {
  title: string;
  agent: AgentKind;
  description?: string;
  /** `Project.structure` 에 그대로 저장될 JSON (예: { tree: FolderNode[] }) */
  structure?: Record<string, unknown>;
  /** 썸네일 (data URL 또는 외부 URL) */
  thumbnailUrl?: string;
  /** 로컬 폴더 절대경로 — tooltip 등에서 path prefix 자를 때 사용 */
  cwd?: string;
  sessions: Session[];
};

export async function saveProject(
  input: SaveProjectInput,
  deps: { projects: ProjectRepository; users: UserRepository },
): Promise<string> {
  const owner = await getOrCreateDefaultUser(deps.users);
  return deps.projects.create({
    title: input.title,
    ownerId: owner.id,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
    structure: input.structure,
    cwd: input.cwd,
    agent: input.agent,
    sessions: input.sessions.map((s) => {
      const m = aggregateSessionMetrics(s.events);
      const errors = extractErrors(s);
      const timeline = extractTimeline(s);
      return {
        title: s.title,
        model: m.model ?? "unknown",
        startedAt: parseDate(s.startedAt),
        endedAt: parseDate(s.endedAt),
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        totalTokens: m.totalTokens,
        errors: errors.map((e) => ({
          errorType: e.errorType,
          errorMessage: e.errorMessage,
          occurredAt: new Date(e.occurredAt),
        })),
        events: timeline,
      };
    }),
  });
}

function parseDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

async function getOrCreateDefaultUser(users: UserRepository) {
  const existing = await users.findByEmail(DEFAULT_USER_EMAIL);
  if (existing) return existing;
  return users.create({ email: DEFAULT_USER_EMAIL, name: "default" });
}
