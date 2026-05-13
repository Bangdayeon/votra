"use server";

import { revalidatePath } from "next/cache";

import { detectAgent } from "@/domain/agent/detectAgent";
import type { FolderFile } from "@/domain/agent/types";
import { saveProject } from "@/application/saveProject";

const TITLE_FIELD = "__title";

export type AddProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function addProject(formData: FormData): Promise<AddProjectResult> {
  const title = formData.get(TITLE_FIELD);
  if (typeof title !== "string" || title.length === 0) {
    return { ok: false, error: "프로젝트 이름이 없어요." };
  }

  const files = collectFiles(formData);
  if (files.length === 0) {
    return { ok: false, error: "업로드된 파일이 없어요." };
  }

  const adapter = detectAgent(files);
  if (!adapter) {
    return { ok: false, error: "알 수 없는 agent 폴더예요. (.claude/projects/... 이 있어야 해요)" };
  }

  const sessions = await adapter.parse(files);
  if (sessions.length === 0) {
    return { ok: false, error: "세션이 한 개도 발견되지 않았어요." };
  }

  const projectId = await saveProject({
    title,
    agent: adapter.kind,
    sessions,
  });

  revalidatePath("/");
  return { ok: true, projectId };
}

function collectFiles(formData: FormData): FolderFile[] {
  const files: FolderFile[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === TITLE_FIELD) continue;
    if (!(value instanceof File)) continue;
    files.push({
      relativePath: key,
      readText: () => value.text(),
    });
  }
  return files;
}
