import type { ReflectionSuggestedTask } from "@/domain/memory/memoryTierTypes";
import type { TaskRepository } from "@/application/ports/taskRepository";

const PROPOSAL_PREFIX = "[AI 제안] ";

function priorityToNumber(p: "high" | "medium" | "low"): number {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

export async function createProposalTasks(
  projectId: string,
  userId: string,
  suggestedTasks: ReflectionSuggestedTask[],
  deps: { tasks: TaskRepository },
): Promise<void> {
  if (suggestedTasks.length === 0) return;

  const existing = await deps.tasks.listByFilter({ projectId, limit: 200 });
  const activeTitles = new Set(
    existing
      .filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS")
      .map((t) => t.title.replace(PROPOSAL_PREFIX, "").toLowerCase().trim()),
  );

  for (const st of suggestedTasks) {
    const normalized = st.title.toLowerCase().trim();
    if (activeTitles.has(normalized)) continue;

    await deps.tasks.create({
      projectId,
      userId,
      title: `${PROPOSAL_PREFIX}${st.title}`,
      description: st.reason,
      priority: priorityToNumber(st.priority),
    });
    activeTitles.add(normalized);
  }
}
