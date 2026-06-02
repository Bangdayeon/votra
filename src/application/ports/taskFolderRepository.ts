import type { FolderRecord } from "@/domain/memory/types";

export type FolderCreateInput = {
  name: string;
  projectId: string;
  userId: string;
  icon?: string | null;
  color?: string | null;
};

export type FolderUpdateInput = {
  id: string;
  projectId: string;
  name: string;
  icon?: string | null;
  color?: string | null;
};

export type TaskFolderRepository = {
  create: (input: FolderCreateInput) => Promise<FolderRecord>;
  update: (input: FolderUpdateInput) => Promise<FolderRecord | null>;
  delete: (id: string, projectId: string) => Promise<boolean>;
  listByProject: (projectId: string) => Promise<FolderRecord[]>;
  reorderAll: (items: { id: string; sortOrder: number }[]) => Promise<void>;
};
