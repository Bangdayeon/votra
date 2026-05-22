import { describe, expect, it } from "vitest";
import { buildStatusView } from "@application/views/buildStatusView";
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

describe("buildStatusView", () => {
  it("agentKind 를 recentSessions 에 포함한다", () => {
    const sessions = [
      makeSession({ sessionId: "s1", agentKind: "CURSOR", startedAt: new Date("2025-01-03T10:00:00Z") }),
      makeSession({ sessionId: "s2", agentKind: "GEMINI", startedAt: new Date("2025-01-02T10:00:00Z") }),
      makeSession({ sessionId: "s3", agentKind: "CODEX", startedAt: new Date("2025-01-01T10:00:00Z") }),
    ];

    const view = buildStatusView(sessions);

    expect(view.recentSessions[0].agentKind).toBe("CURSOR");
    expect(view.recentSessions[1].agentKind).toBe("GEMINI");
    expect(view.recentSessions[2].agentKind).toBe("CODEX");
  });

  it("최대 5개 세션을 최신순으로 반환한다", () => {
    const sessions = Array.from({ length: 7 }, (_, i) =>
      makeSession({
        sessionId: `s${i}`,
        startedAt: new Date(2025, 0, i + 1),
        agentKind: `AGENT_${i}`,
      }),
    );

    const view = buildStatusView(sessions);

    expect(view.recentSessions).toHaveLength(5);
    expect(view.recentSessions[0].agentKind).toBe("AGENT_6");
  });

  it("2개 이상 세션에서 수정된 파일을 repeatedFiles 로 반환한다", () => {
    const sessions = [
      makeSession({ sessionId: "s1", filesModified: ["/src/auth.ts", "/src/user.ts"], startedAt: new Date("2025-01-03T00:00:00Z") }),
      makeSession({ sessionId: "s2", filesModified: ["/src/auth.ts"], startedAt: new Date("2025-01-02T00:00:00Z") }),
      makeSession({ sessionId: "s3", filesModified: ["/src/other.ts"], startedAt: new Date("2025-01-01T00:00:00Z") }),
    ];

    const view = buildStatusView(sessions);

    expect(view.repeatedFiles).toContain("/src/auth.ts");
    expect(view.repeatedFiles).not.toContain("/src/user.ts");
    expect(view.repeatedFiles).not.toContain("/src/other.ts");
  });

  it("리스크 키워드 파일이 반복 수정된 경우 riskSignals 에 포함한다", () => {
    const sessions = [
      makeSession({ sessionId: "s1", filesModified: ["/src/auth.service.ts"], startedAt: new Date("2025-01-02T00:00:00Z") }),
      makeSession({ sessionId: "s2", filesModified: ["/src/auth.service.ts"], startedAt: new Date("2025-01-01T00:00:00Z") }),
    ];

    const view = buildStatusView(sessions);

    expect(view.riskSignals).toHaveLength(1);
    expect(view.riskSignals[0].file).toBe("/src/auth.service.ts");
  });
});
