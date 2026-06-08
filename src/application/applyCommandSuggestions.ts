import type { CommandRepository } from "@/application/ports/commandRepository";
import type { ToolSuggestion } from "@/domain/memory/memoryTierTypes";

export async function applyCommandSuggestions(
  userId: string,
  suggestions: ToolSuggestion[],
  deps: { commands: CommandRepository },
): Promise<void> {
  if (suggestions.length === 0) return;

  await Promise.all(
    suggestions.map((s) =>
      deps.commands.upsertByName({
        userId,
        name: s.name,
        description: s.description,
        folder: s.folder,
        content: s.content,
      }),
    ),
  );
}
