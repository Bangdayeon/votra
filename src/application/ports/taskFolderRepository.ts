import type { FolderRecord } from "@/domain/memory/types";

export type FolderCreateInput = {
  name: string;
  projectId: string;
  userId: string;
};

export type FolderUpdateInput = {
  id: string;
  projectId: string;
  name: string;
};

export type TaskFolderRepository = {
  create: (input: FolderCreateInput) => Promise<FolderRecord>;
  update: (input: FolderUpdateInput) => Promise<FolderRecord | null>;
  delete: (id: string, projectId: string) => Promise<boolean>;
  listByProject: (projectId: string) => Promise<FolderRecord[]>;
};
