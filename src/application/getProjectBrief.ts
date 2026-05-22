import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import type { TaskRepository } from "@/application/ports/taskRepository";
import type { ThoughtRepository } from "@/application/ports/thoughtRepository";
import type { TaskRecord, ThoughtRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export type ProjectBrief = {
  projectTitle: string;
  cwd: string | null;
  pendingTasks: TaskRecord[];
  inProgressTasks: TaskRecord[];
  recentDecisions: ThoughtRecord[];
  recentlyDone: TaskRecord[];
  rules: string[];
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
    thoughts: ThoughtRepository;
    claudeFiles: ClaudeFileRepository;
  },
): Promise<Result<ProjectBrief, string>> {
  try {
    const [
      pendingTasks,
      inProgressTasks,
      recentDecisions,
      recentlyDone,
      claudeFiles,
    ] = await Promise.all([
      deps.tasks.listByFilter({
        projectId: input.projectId,
        userId: input.userId,
        status: "PENDING",
      }),
      deps.tasks.listByFilter({
        projectId: input.projectId,
        userId: input.userId,
        status: "IN_PROGRESS",
      }),
      deps.thoughts.listRecent({
        projectId: input.projectId,
        userId: input.userId,
        limit: 10,
      }),
      deps.tasks.findRecentDone({
        projectId: input.projectId,
        userId: input.userId,
        limit: 5,
      }),
      deps.claudeFiles.findByProject(input.projectId),
    ]);

    // CLAUDE.md / AGENTS.md에서 bullet 규칙 추출 (project-root 우선)
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
      rules,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "브리핑 조회에 실패했어요.");
  }
}

function extractRules(content: string): string[] {
  return content
    .split("\n")
    .filter((line) => /^[-*]|^#{1,3}\s/.test(line.trim()))
    .map((line) => line.trim())
    .slice(0, 20);
}
