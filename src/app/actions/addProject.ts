"use server";

import { revalidatePath } from "next/cache";

import { saveProject } from "@/application/saveProject";
import { detectAgent } from "@/domain/agent/detectAgent";
import type { FolderFile } from "@/domain/agent/types";
import type { FolderNode } from "@/shared/folder/types";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";
import { prismaUserRepository } from "@/infrastructure/repositories/prismaUserRepository";

export type AddProjectInput = {
  title: string;
  tree: FolderNode[];
  jsonlFiles: { path: string; content: string }[];
};

export type AddProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function addProject(input: AddProjectInput): Promise<AddProjectResult> {
  if (!input.title || input.title.length === 0) {
    return { ok: false, error: "프로젝트 이름이 없어요." };
  }
  if (input.jsonlFiles.length === 0) {
    return { ok: false, error: "jsonl 파일이 한 개도 없어요." };
  }

  const files: FolderFile[] = input.jsonlFiles.map((f) => ({
    relativePath: f.path,
    readText: () => Promise.resolve(f.content),
  }));

  const adapter = detectAgent(files);
  if (!adapter) {
    return {
      ok: false,
      error: "알 수 없는 agent 폴더예요. (.claude/projects/... 같은 구조 필요)",
    };
  }

  const sessions = await adapter.parse(files);
  if (sessions.length === 0) {
    return { ok: false, error: "세션이 한 개도 발견되지 않았어요." };
  }

  const projectId = await saveProject(
    {
      title: input.title,
      agent: adapter.kind,
      structure: { tree: input.tree },
      sessions,
    },
    { projects: prismaProjectRepository, users: prismaUserRepository },
  );

  revalidatePath("/");
  return { ok: true, projectId };
}
