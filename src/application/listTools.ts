import type { ToolRepository } from "@/application/ports/toolRepository";
import type { ProjectToolRecord } from "@/domain/memory/types";
import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export async function listTools(
  userId: string,
  deps: { tools: ToolRepository },
): Promise<Result<ProjectToolRecord[], string>> {
  try {
    const tools = await deps.tools.listGlobal(userId);
    return ok(tools);
  } catch (e) {
    return err(e instanceof Error ? e.message : "커스텀 툴 목록을 불러오지 못했어요.");
  }
}
