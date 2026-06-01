import type { TaskRepository } from "@/application/ports/taskRepository";
import type { TaskRecord } from "@/domain/memory/types";
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
  },
): Promise<Result<ProjectBrief, string>> {
  try {
    const [pendingTasks, inProgressTasks, recentlyDone, recentlyModified] =
      await Promise.all([
        deps.tasks.listByFilter({ projectId: input.projectId, userId: input.userId, status: "PENDING", limit: 20 }),
        deps.tasks.listByFilter({ projectId: input.projectId, userId: input.userId, status: "IN_PROGRESS", limit: 20 }),
        deps.tasks.findRecentDone({ projectId: input.projectId, userId: input.userId, limit: 5 }),
        deps.tasks.findRecentByUpdatedAt({ projectId: input.projectId, userId: input.userId, limit: 10 }),
      ]);

    const recentDecisions = recentlyDone.filter((t) => t.keyDecisions.length > 0);

    return ok({
      projectTitle: input.projectTitle,
      cwd: input.cwd,
      pendingTasks,
      inProgressTasks,
      recentDecisions,
      recentlyDone,
      recentlyModified,
      rules: [],
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "브리핑 조회에 실패했어요.");
  }
}
