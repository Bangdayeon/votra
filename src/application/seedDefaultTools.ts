import { DEFAULT_TOOLS } from "@/domain/memory/defaultTools";
import type { ToolRepository } from "@/application/ports/toolRepository";

export async function seedDefaultTools(
  projectId: string,
  deps: { tools: ToolRepository },
): Promise<void> {
  for (const tool of DEFAULT_TOOLS) {
    await deps.tools.upsertByName({
      projectId,
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      folder: tool.folder,
      content: tool.content,
      contextHint: tool.contextHint,
    });
  }
}
