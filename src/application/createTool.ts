import type { CreateToolInput, ToolRepository } from "@/application/ports/toolRepository";
import type { ProjectToolRecord } from "@/domain/memory/types";
import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export async function createTool(
  input: CreateToolInput,
  deps: { tools: ToolRepository },
): Promise<Result<ProjectToolRecord, string>> {
  if (!input.name.trim()) return err("툴 이름이 필요해요.");
  if (!input.content.trim()) return err("툴 내용이 필요해요.");
  try {
    const tool = await deps.tools.create(input);
    return ok(tool);
  } catch (e) {
    return err(e instanceof Error ? e.message : "커스텀 툴 생성에 실패했어요.");
  }
}
