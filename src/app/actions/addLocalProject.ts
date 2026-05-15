"use server";

import { revalidatePath } from "next/cache";

import { ingestClaudeFiles } from "@/application/ingestClaudeFiles";
import { saveProject } from "@/application/saveProject";
import { claudeCodeAdapter } from "@/domain/agent/claudeCode";
import type { FolderFile } from "@/domain/agent/types";
import { extractCwd } from "@/domain/session/extractCwd";
import type { FolderNode } from "@/components/FolderTree";
import type { ClaudeProjectSource } from "@/infrastructure/localScan/discoverClaudeProjects";
import { loadClaudeProjectFiles } from "@/infrastructure/localScan/loadClaudeProjectFiles";
import { scanClaudeFilesForIngest } from "@/infrastructure/localScan/scanClaudeFilesForIngest";
import { scanLocalFolderTree } from "@/infrastructure/localScan/scanLocalFolderTree";
import { prismaClaudeFileRepository } from "@/infrastructure/repositories/prismaClaudeFileRepository";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaUserRepository } from "@/infrastructure/repositories/prismaUserRepository";

/** 클라이언트가 이미 read 해서 보내는 jsonl 한 개 (원격 SaaS 분기) */
export type InlineClaudeFile = { relativePath: string; content: string };

export type AddLocalProjectInput = {
  agentKind: "CLAUDE"; // 다른 agent 는 추후
  /** 서버 fs 로 읽을 sources (로컬 dev 분기) — inlineFiles 와 둘 중 하나만 */
  sources?: ClaudeProjectSource[];
  /** 브라우저 picker 로 이미 read 한 파일들 (원격 SaaS 분기) */
  inlineFiles?: InlineClaudeFile[];
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

  const files = await resolveFiles(input);
  if (files.length === 0) {
    return { ok: false, error: "jsonl 파일이 없어요." };
  }

  const sessions = await claudeCodeAdapter.parse(files);
  if (sessions.length === 0) {
    return { ok: false, error: "세션이 한 개도 발견되지 않았어요." };
  }

  const cwd = extractCwd(sessions);
  // inlineFiles 분기 (원격 SaaS) 에서는 서버가 사용자 디스크에 접근 못 하므로 autoScanTree 스킵
  const canAutoScan = !input.inlineFiles;
  const tree =
    input.tree ?? (canAutoScan && cwd ? await autoScanTree(cwd) : undefined);

  const projectId = await saveProject(
    {
      title: input.title,
      agent: "CLAUDE",
      description: input.description,
      structure: tree ? { tree } : undefined,
      thumbnailUrl: input.thumbnailUrl,
      cwd: cwd ?? undefined,
      sessions,
    },
    { projects: prismaProjectRepository, users: prismaUserRepository },
  );

  // 로컬 dev 분기에서만 서버 fs 가 사용자 머신과 같은 디스크라 스캔이 의미 있어요.
  // 원격 SaaS (inlineFiles) 에서는 CLI 가 별도 ingest 엔드포인트로 보내야 함.
  if (canAutoScan && cwd) {
    const files = await scanClaudeFilesForIngest(cwd);
    await ingestClaudeFiles(
      { projectId, files },
      { claudeFiles: prismaClaudeFileRepository },
    );
  }

  revalidatePath("/");
  return { ok: true, projectId };
}

async function resolveFiles(input: AddLocalProjectInput): Promise<FolderFile[]> {
  if (input.inlineFiles && input.inlineFiles.length > 0) {
    return input.inlineFiles.map((f) => ({
      relativePath: f.relativePath,
      readText: async () => f.content,
    }));
  }
  if (input.sources && input.sources.length > 0) {
    return loadClaudeProjectFiles(input.sources);
  }
  return [];
}

async function autoScanTree(cwd: string): Promise<FolderNode[] | undefined> {
  const children = await scanLocalFolderTree(cwd);
  if (!children) return undefined;
  const rootName = cwd.split("/").filter(Boolean).pop() ?? cwd;
  return [{ name: rootName, color: "blue", children, defaultOpen: true }];
}
