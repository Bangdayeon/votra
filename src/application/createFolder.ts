import type { FolderCreateInput, TaskFolderRepository } from "@/application/ports/taskFolderRepository";
import type { FolderRecord } from "@/domain/memory/types";
import { err, ok } from "@/shared/lib/result";
import type { Result } from "@/shared/lib/result";

export async function createFolder(
  input: FolderCreateInput,
  deps: { folders: TaskFolderRepository },
): Promise<Result<FolderRecord, string>> {
  if (!input.name.trim()) {
    return err("폴더 이름을 입력해주세요.");
  }
  try {
    const folder = await deps.folders.create({ ...input, name: input.name.trim() });
    return ok(folder);
  } catch (e) {
    return err(e instanceof Error ? e.message : "폴더 생성에 실패했어요.");
  }
}
