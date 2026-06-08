import { DEFAULT_COMMANDS } from "@/domain/memory/defaultCommands";
import type { CommandRepository } from "@/application/ports/commandRepository";

export async function seedDefaultCommands(
  userId: string,
  deps: { commands: CommandRepository },
): Promise<void> {
  for (const cmd of DEFAULT_COMMANDS) {
    await deps.commands.upsertByName({
      userId,
      slug: cmd.slug,
      name: cmd.name,
      description: cmd.description,
      folder: cmd.folder,
      content: cmd.content,
      isBuiltIn: true,
    });
  }
}
