import type { CommandRepository } from "@/application/ports/commandRepository";
import type { ProjectCommandRecord } from "@/domain/memory/types";
import { ok, err } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function listCommands(
  userId: string,
  deps: { commands: CommandRepository },
): Promise<Result<ProjectCommandRecord[], string>> {
  try {
    const commands = await deps.commands.listByUser(userId);
    return ok(commands);
  } catch (e) {
    return err(e instanceof Error ? e.message : "커맨드 목록을 불러오지 못했어요.");
  }
}
