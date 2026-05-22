import { aggregateSessionMetrics } from "@/domain/session/aggregateSessionMetrics";
import { extractCwd } from "@/domain/session/extractCwd";
import { extractTimeline } from "@/domain/session/extractTimeline";
import { extractTitle } from "@/domain/session/extractTitle";
import type { RawEvent, Session } from "@/domain/session/types";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import type { AgentKind } from "@/domain/agent/types";
import { err, ok, type Result } from "@/shared/lib/result";

export type IngestSessionPayload = {
  /** raw jsonl sessionId */
  id: string;
  title?: string;
  startedAt?: string;
  endedAt?: string;
  events: RawEvent[];
};

export type IngestSessionEventsInput = {
  /** CLI 가 보낸 file/directory 경로. Project.cwd 매칭 키. */
  source: string;
  sessions: IngestSessionPayload[];
  /** 인증 통과한 사용자 — Project 자동 생성 시 ownerId 로 사용. */
  userId: string;
  /** 세션을 생성한 에이전트. 기본값 "CLAUDE". */
  agent?: AgentKind;
};

export type IngestSessionResult = {
  id: string;
  prismaId: string;
  inserted: number;
};

export type IngestSessionEventsResult = {
  projectId: string;
  insertedEvents: number;
  sessions: IngestSessionResult[];
};

export async function ingestSessionEvents(
  input: IngestSessionEventsInput,
  deps: { projects: ProjectRepository },
): Promise<Result<IngestSessionEventsResult, string>> {
  if (!input.source || input.source.length === 0) {
    return err("source 가 비어 있어요.");
  }

  // CLI 의 source 는 .claude/projects 하위 파일/폴더 경로라 Project.cwd 로 그대로
  // 쓰면 phantom 프로젝트가 생겨요. RawEvent.cwd (실제 작업 디렉토리) 가 잡힐 때만
  // 프로젝트를 생성/매칭하고, 추출 실패 시 ingest 를 건너뜁니다.
  const asSessions: Session[] = input.sessions.map((s) => ({
    id: s.id,
    title: s.title ?? "",
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    events: s.events,
  }));
  const projectCwd = extractCwd(asSessions);
  if (!projectCwd) {
    return err("세션 이벤트에서 cwd 를 추출하지 못해 ingest 를 건너뛰어요.");
  }

  const project =
    (await deps.projects.findByCwd({
      cwd: projectCwd,
      ownerId: input.userId,
    })) ??
    (await deps.projects.createForIngest({
      cwd: projectCwd,
      title: deriveProjectTitle(projectCwd),
      ownerId: input.userId,
      agent: input.agent ?? "CLAUDE",
    }));

  let insertedEvents = 0;
  const sessionResults: IngestSessionResult[] = [];

  for (const session of input.sessions) {
    const metrics = aggregateSessionMetrics(session.events);
    const agent = input.agent ?? "CLAUDE";
    const prismaId = await deps.projects.upsertIngestSession({
      projectId: project.id,
      agent,
      session: {
        externalId: session.id,
        title: session.title ?? extractTitle(session.events),
        model: agentDefaultModel(agent) ?? metrics.model,
        startedAt: parseDate(session.startedAt),
        endedAt: parseDate(session.endedAt),
      },
    });

    // CLI 가 재시작되면 같은 raw uuid 가 다시 들어와요. 이미 적재된 raw uuid 는
    // 이벤트 dedup + usage 누적 모두 skip 해서 idempotent 유지.
    const incomingUuids = session.events
      .map((e) => e.uuid)
      .filter((u): u is string => typeof u === "string");
    const existing = await deps.projects.findExistingEventUuids(
      prismaId,
      incomingUuids,
    );
    const freshRawEvents = session.events.filter(
      (e) => !(typeof e.uuid === "string" && existing.has(e.uuid)),
    );

    if (freshRawEvents.length === 0) {
      sessionResults.push({ id: session.id, prismaId, inserted: 0 });
      continue;
    }

    const timeline = extractTimeline({
      id: session.id,
      title: session.title ?? "",
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      events: freshRawEvents,
    });
    const inserted = await deps.projects.appendEvents(prismaId, timeline);
    const freshMetrics = aggregateSessionMetrics(freshRawEvents);
    await deps.projects.addTokenUsage(prismaId, {
      inputTokens: freshMetrics.inputTokens,
      outputTokens: freshMetrics.outputTokens,
    });

    insertedEvents += inserted;
    sessionResults.push({ id: session.id, prismaId, inserted });
  }

  return ok({
    projectId: project.id,
    insertedEvents,
    sessions: sessionResults,
  });
}

function parseDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function deriveProjectTitle(source: string): string {
  const segments = source.split(/[\\/]/).filter((s) => s.length > 0);
  return segments[segments.length - 1] ?? source;
}

function agentDefaultModel(agent: string): string | null {
  if (agent === "CURSOR") return "cursor";
  if (agent === "GEMINI") return "gemini";
  if (agent === "CODEX") return "codex";
  if (agent === "ANTIGRAVITY") return "antigravity";
  return null;
}
