import type { ToolRepository } from "@/application/ports/toolRepository";
import type { ToolEnrichment } from "@/domain/memory/memoryTierTypes";

export async function applyToolEnrichments(
  projectId: string,
  userId: string,
  enrichments: ToolEnrichment[],
  deps: { tools: ToolRepository },
): Promise<void> {
  if (enrichments.length === 0) return;

  const allTools = await deps.tools.listByProject(projectId);

  await Promise.all(
    enrichments.map(async (e) => {
      const tool = allTools.find(
        (t) => t.name.toLowerCase() === e.targetToolName.toLowerCase(),
      );
      if (!tool) return;

      const separator = tool.content.endsWith("\n") ? "\n" : "\n\n";
      await deps.tools.upsertByName({
        userId,
        projectId,
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
        folder: tool.folder,
        content: tool.content + separator + e.addToContent,
        patternSummary: tool.patternSummary ?? undefined,
        contextHint: tool.contextHint ?? undefined,
        hookEvent: tool.hookEvent ?? undefined,
        hookMatcher: tool.hookMatcher ?? undefined,
        hookScript: tool.hookScript ?? undefined,
      });
    }),
  );
}
