import type { CreateCommandInput, CommandRepository } from "@/application/ports/commandRepository";
import { ok, err } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";
import type { ProjectCommandRecord } from "@/domain/memory/types";

export async function createCommand(
  input: CreateCommandInput,
  deps: { commands: CommandRepository },
): Promise<Result<ProjectCommandRecord, string>> {
  if (!input.name.trim()) return err("커맨드 이름이 필요해요.");
  if (!input.content.trim()) return err("커맨드 내용이 필요해요.");
  try {
    const command = await deps.commands.create(input);
    return ok(command);
  } catch (e) {
    return err(e instanceof Error ? e.message : "커맨드 생성에 실패했어요.");
  }
}
