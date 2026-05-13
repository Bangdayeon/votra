"use server";

import { revalidatePath } from "next/cache";

import { saveProject } from "@/application/saveProject";
import { claudeCodeAdapter } from "@/domain/agent/claudeCode";
import type { FolderNode } from "@/components/FolderTree";
import { loadClaudeProjectFiles } from "@/infrastructure/localScan/loadClaudeProjectFiles";

export type AddLocalProjectInput = {
  agentKind: "CLAUDE"; // 다른 agent 는 추후
  encodedPath: string;
  title: string;
  tree?: FolderNode[];
};

export type AddLocalProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function addLocalProject(
  input: AddLocalProjectInput,
): Promise<AddLocalProjectResult> {
  if (!input.title) return { ok: false, error: "프로젝트 이름이 없어요." };

  const files = await loadClaudeProjectFiles(input.encodedPath);
  if (files.length === 0) {
    return { ok: false, error: "jsonl 파일이 없는 폴더예요." };
  }

  const sessions = await claudeCodeAdapter.parse(files);
  if (sessions.length === 0) {
    return { ok: false, error: "세션이 한 개도 발견되지 않았어요." };
  }

  const projectId = await saveProject({
    title: input.title,
    agent: "CLAUDE",
    structure: input.tree ? { tree: input.tree } : undefined,
    sessions,
  });

  revalidatePath("/");
  return { ok: true, projectId };
}
