import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import type { SessionLogRepository } from "@/application/ports/sessionLogRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import type { SessionLogRecord, TaskRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type ProjectBrief = {
  projectTitle: string;
  cwd: string | null;
  pendingTasks: TaskRecord[];
  inProgressTasks: TaskRecord[];
  recentDecisions: TaskRecord[];
  recentlyDone: TaskRecord[];
  recentlyModified: TaskRecord[];
  rules: string[];
  lastSessionSummary: SessionLogRecord | null;
};

export type GetProjectBriefInput = {
  projectId: string;
  userId: string;
  projectTitle: string;
  cwd: string | null;
};

export async function getProjectBrief(
  input: GetProjectBriefInput,
  deps: {
    tasks: TaskRepository;
    claudeFiles: ClaudeFileRepository;
    sessionLogs: SessionLogRepository;
  },
): Promise<Result<ProjectBrief, string>> {
  try {
    const [pendingTasks, inProgressTasks, recentlyDone, claudeFiles, recentSessions, recentlyModified] =
      await Promise.all([
        deps.tasks.listByFilter({ projectId: input.projectId, userId: input.userId, status: "PENDING" }),
        deps.tasks.listByFilter({ projectId: input.projectId, userId: input.userId, status: "IN_PROGRESS" }),
        deps.tasks.findRecentDone({ projectId: input.projectId, userId: input.userId, limit: 5 }),
        deps.claudeFiles.findByProject(input.projectId),
        deps.sessionLogs.listRecent({ projectId: input.projectId, userId: input.userId, limit: 1 }),
        deps.tasks.findRecentByUpdatedAt({ projectId: input.projectId, userId: input.userId, limit: 10 }),
      ]);

    const recentDecisions = recentlyDone.filter((t) => t.keyDecisions.length > 0);

    const ruleFile =
      claudeFiles.find((f) => f.kind === "CLAUDE" && f.scope === "project-root") ??
      claudeFiles.find((f) => f.kind === "AGENTS" && f.scope === "project-root") ??
      claudeFiles[0];

    const rules = ruleFile ? extractRules(ruleFile.content) : [];

    return ok({
      projectTitle: input.projectTitle,
      cwd: input.cwd,
      pendingTasks,
      inProgressTasks,
      recentDecisions,
      recentlyDone,
      recentlyModified,
      rules,
      lastSessionSummary: recentSessions[0] ?? null,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "브리핑 조회에 실패했어요.");
  }
}

const rulesCache = new Map<string, string[]>();

function extractRules(content: string): string[] {
  const cached = rulesCache.get(content);
  if (cached) return cached;

  const rules = content
    .split("\n")
    .filter((line) => /^[-*]|^#{1,3}\s/.test(line.trim()))
    .map((line) => line.trim())
    .slice(0, 20);

  rulesCache.set(content, rules);
  return rules;
}
