import type { ToolRepository } from "@/application/ports/toolRepository";
import type { ToolSuggestion } from "@/domain/memory/memoryTierTypes";

export async function applyToolSuggestions(
  projectId: string,
  userId: string,
  suggestions: ToolSuggestion[],
  deps: { tools: ToolRepository },
): Promise<void> {
  if (suggestions.length === 0) return;

  await Promise.all(
    suggestions.map((s) =>
      deps.tools.upsertByName({
        userId,
        projectId,
        name: s.name,
        description: s.description,
        folder: s.folder,
        content: s.content,
        patternSummary: s.patternSummary,
        contextHint: s.contextHint,
        hookEvent: s.hookEvent ?? undefined,
        hookMatcher: s.hookMatcher ?? undefined,
        hookScript: s.hookScript ?? undefined,
      }),
    ),
  );
}
