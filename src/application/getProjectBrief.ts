import type { EmbeddingClient } from "@/application/ports/embeddingClient";
import type { TaskRepository } from "@/application/ports/taskRepository";
import { recallThoughts } from "@/application/recallThoughts";
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
    embedding?: EmbeddingClient;
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

    let recentDecisions: TaskRecord[];
    if (inProgressTasks.length > 0 && deps.embedding) {
      const query = inProgressTasks.map((t) => t.title).join(", ");
      const recalled = await recallThoughts(
        { query, projectId: input.projectId, userId: input.userId, limit: 5 },
        { tasks: deps.tasks, embedding: deps.embedding },
      );
      const hits = recalled.ok ? recalled.value.filter((t) => t.keyDecisions.length > 0) : [];
      recentDecisions = hits.length > 0 ? hits : recentlyDone.filter((t) => t.keyDecisions.length > 0);
    } else {
      recentDecisions = recentlyDone.filter((t) => t.keyDecisions.length > 0);
    }

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
