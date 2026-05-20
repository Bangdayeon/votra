import { describe, expect, it } from "vitest";
import { buildParsedSession } from "@domain/session/buildParsedSession";
import type { SessionEventRow } from "@application/ports/sessionRepository";

const makeEvent = (
  overrides: Partial<SessionEventRow> & { type: SessionEventRow["type"] },
): SessionEventRow => ({
  id: "e1",
  role: null,
  content: null,
  timestamp: new Date("2025-01-01T10:00:00Z"),
  metadata: null,
  ...overrides,
});

describe("buildParsedSession", () => {
  it("파일 수정·읽기·에러·툴 카운트·intentHint·isComplete를 올바르게 추출한다", () => {
    const events: SessionEventRow[] = [
      makeEvent({
        id: "e1",
        type: "ASSISTANT",
        content: "인증 로직을 리팩토링할게요.",
      }),
      makeEvent({
        id: "e2",
        type: "TOOL_CALL",
        metadata: { toolName: "Read", toolInput: { file_path: "/src/auth.ts" } },
      }),
      makeEvent({
        id: "e3",
        type: "TOOL_CALL",
        metadata: { toolName: "Bash" },
      }),
      makeEvent({
        id: "e4",
        type: "FILE_EDIT",
        metadata: { path: "/src/auth.ts", toolName: "Edit" },
      }),
      makeEvent({
        id: "e5",
        type: "FILE_EDIT",
        metadata: { path: "/src/session.ts", toolName: "Write" },
      }),
      makeEvent({
        id: "e6",
        type: "ERROR",
        content: "TypeError: cannot read property of undefined",
        metadata: { errorType: "Bash" },
      }),
      makeEvent({
        id: "e7",
        type: "ASSISTANT",
        content: "수정 완료했어요.",
      }),
    ];

    const result = buildParsedSession({
      id: "session-1",
      title: "Auth 리팩토링",
      startedAt: new Date("2025-01-01T10:00:00Z"),
      events,
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.title).toBe("Auth 리팩토링");
    expect(result.filesModified).toEqual(["/src/auth.ts", "/src/session.ts"]);
    expect(result.filesRead).toEqual(["/src/auth.ts"]);
    expect(result.errors).toEqual([
      { type: "Bash", context: "TypeError: cannot read property of undefined" },
    ]);
    expect(result.toolCallCounts).toEqual({ Read: 1, Bash: 1 });
    expect(result.intentHint).toBe("인증 로직을 리팩토링할게요.");
    expect(result.isComplete).toBe(true);
  });
});
