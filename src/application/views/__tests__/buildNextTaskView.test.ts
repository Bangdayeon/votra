import { describe, expect, it } from "vitest";
import { buildNextTaskView } from "@application/views/buildNextTaskView";
import type { ParsedSession } from "@domain/session/types";

const makeSession = (overrides: Partial<ParsedSession> & { sessionId: string }): ParsedSession => ({
  title: "테스트 세션",
  agentKind: "CLAUDE",
  startedAt: new Date("2025-01-01T10:00:00Z"),
  filesModified: [],
  filesRead: [],
  errors: [],
  toolCallCounts: {},
  intentHint: "",
  isComplete: true,
  ...overrides,
});

describe("buildNextTaskView", () => {
  it("agentKind 를 recentWorkFlow 에 포함한다", () => {
    const sessions = [
      makeSession({ sessionId: "s1", agentKind: "CURSOR", startedAt: new Date("2025-01-03T00:00:00Z") }),
      makeSession({ sessionId: "s2", agentKind: "GEMINI", startedAt: new Date("2025-01-02T00:00:00Z") }),
      makeSession({ sessionId: "s3", agentKind: "CODEX", startedAt: new Date("2025-01-01T00:00:00Z") }),
    ];

    const view = buildNextTaskView(sessions);

    expect(view.recentWorkFlow[0].agentKind).toBe("CURSOR");
    expect(view.recentWorkFlow[1].agentKind).toBe("GEMINI");
    expect(view.recentWorkFlow[2].agentKind).toBe("CODEX");
  });

  it("agentKind 를 incompleteSignals 에 포함한다", () => {
    const sessions = [
      makeSession({ sessionId: "s1", agentKind: "ANTIGRAVITY", isComplete: false, startedAt: new Date("2025-01-02T00:00:00Z") }),
      makeSession({ sessionId: "s2", agentKind: "CLAUDE", isComplete: true, startedAt: new Date("2025-01-01T00:00:00Z") }),
    ];

    const view = buildNextTaskView(sessions);

    expect(view.incompleteSignals).toHaveLength(1);
    expect(view.incompleteSignals[0].agentKind).toBe("ANTIGRAVITY");
  });

  it("lastSessionFiles 는 가장 최근 세션의 filesModified 를 반환한다", () => {
    const sessions = [
      makeSession({ sessionId: "s1", filesModified: ["/src/a.ts"], startedAt: new Date("2025-01-02T00:00:00Z") }),
      makeSession({ sessionId: "s2", filesModified: ["/src/b.ts"], startedAt: new Date("2025-01-01T00:00:00Z") }),
    ];

    const view = buildNextTaskView(sessions);

    expect(view.lastSessionFiles).toEqual(["/src/a.ts"]);
  });

  it("recentWorkFlow 는 최대 3개를 최신순으로 반환한다", () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSession({
        sessionId: `s${i}`,
        startedAt: new Date(2025, 0, i + 1),
        agentKind: `AGENT_${i}`,
      }),
    );

    const view = buildNextTaskView(sessions);

    expect(view.recentWorkFlow).toHaveLength(3);
    expect(view.recentWorkFlow[0].agentKind).toBe("AGENT_4");
  });
});
