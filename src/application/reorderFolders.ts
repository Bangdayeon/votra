import type { TaskFolderRepository } from "@/application/ports/taskFolderRepository";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function reorderFolders(
  input: { orderedIds: string[] },
  deps: { folders: TaskFolderRepository },
): Promise<Result<void, string>> {
  try {
    const items = input.orderedIds.map((id, i) => ({ id, sortOrder: i }));
    await deps.folders.reorderAll(items);
    return ok(undefined);
  } catch (e) {
    return err(e instanceof Error ? e.message : "폴더 순서 변경에 실패했어요.");
  }
}
