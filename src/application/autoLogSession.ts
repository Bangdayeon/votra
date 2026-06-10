import type { SessionLogRepository } from "@/application/ports/sessionLogRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";

type SessionEngine = {
  structure: (summary: string) => Promise<string>;
};

export async function autoLogSession(
  { projectId, userId, sessionId }: { projectId: string; userId: string; sessionId?: string },
  deps: {
    tasks: Pick<TaskRepository, "findRecentDone" | "listByFilter">;
    sessionLogs: Pick<SessionLogRepository, "upsertOrCreate">;
    engine: SessionEngine;
  },
): Promise<{ logged: boolean }> {
  const [doneTasks, inProgressTasks] = await Promise.all([
    deps.tasks.findRecentDone({ projectId, userId, limit: 10 }),
    deps.tasks.listByFilter({ projectId, status: "IN_PROGRESS", limit: 10 }),
  ]);

  if (doneTasks.length === 0 && inProgressTasks.length === 0) {
    return { logged: false };
  }

  const summary = buildSummary(doneTasks, inProgressTasks);
  const markdown = await deps.engine.structure(summary);
  await deps.sessionLogs.upsertOrCreate({ projectId, userId, summary: markdown, aiTool: "claude", sessionId });
  return { logged: true };
}

function buildSummary(done: TaskRecord[], inProgress: TaskRecord[]): string {
  const lines: string[] = ["## 이번 세션 작업 (자동 캡처)"];

  if (done.length > 0) {
    lines.push("\n완료한 태스크:");
    for (const t of done) {
      const outcome = t.outcome ? ` — ${t.outcome.slice(0, 80)}` : "";
      lines.push(`- #${t.seq} ${t.title}${outcome}`);
    }
  }

  if (inProgress.length > 0) {
    lines.push("\n진행 중 태스크:");
    for (const t of inProgress) {
      lines.push(`- #${t.seq} ${t.title}`);
    }
  }

  return lines.join("\n");
}
