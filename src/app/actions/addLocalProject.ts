"use server";

import { revalidatePath } from "next/cache";

import { saveProject } from "@/application/saveProject";
import { claudeCodeAdapter } from "@/domain/agent/claudeCode";
import { extractCwd } from "@/domain/session/extractCwd";
import type { FolderNode } from "@/components/FolderTree";
import type { ClaudeProjectSource } from "@/infrastructure/localScan/discoverClaudeProjects";
import { loadClaudeProjectFiles } from "@/infrastructure/localScan/loadClaudeProjectFiles";
import { scanLocalFolderTree } from "@/infrastructure/localScan/scanLocalFolderTree";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaUserRepository } from "@/infrastructure/repositories/prismaUserRepository";

export type AddLocalProjectInput = {
  agentKind: "CLAUDE"; // 다른 agent 는 추후
  sources: ClaudeProjectSource[];
  title: string;
  description?: string;
  tree?: FolderNode[];
  /** 썸네일 이미지 data URL (예: "data:image/png;base64,...") */
  thumbnailUrl?: string;
};

export type AddLocalProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function addLocalProject(
  input: AddLocalProjectInput,
): Promise<AddLocalProjectResult> {
  if (!input.title) return { ok: false, error: "프로젝트 이름이 없어요." };
  if (!input.sources || input.sources.length === 0) {
    return { ok: false, error: "선택된 작업 기록이 없어요." };
  }

  const files = await loadClaudeProjectFiles(input.sources);
  if (files.length === 0) {
    return { ok: false, error: "jsonl 파일이 없어요." };
  }

  const sessions = await claudeCodeAdapter.parse(files);
  if (sessions.length === 0) {
    return { ok: false, error: "세션이 한 개도 발견되지 않았어요." };
  }

  const tree = input.tree ?? (await autoScanTree(sessions));

  const projectId = await saveProject(
    {
      title: input.title,
      agent: "CLAUDE",
      description: input.description,
      structure: tree ? { tree } : undefined,
      thumbnailUrl: input.thumbnailUrl,
      sessions,
    },
    { projects: prismaProjectRepository, users: prismaUserRepository },
  );

  revalidatePath("/");
  return { ok: true, projectId };
}

async function autoScanTree(sessions: Awaited<ReturnType<typeof claudeCodeAdapter.parse>>): Promise<FolderNode[] | undefined> {
  const cwd = extractCwd(sessions);
  if (!cwd) return undefined;
  const children = await scanLocalFolderTree(cwd);
  if (!children) return undefined;
  const rootName = cwd.split("/").filter(Boolean).pop() ?? cwd;
  return [{ name: rootName, color: "blue", children, defaultOpen: true }];
}
