export type MemoryContextRecord = {
  id: string;
  projectId: string;
  content: string;
  version: number;
  updatedAt: Date;
};

export type MemoryContextRepository = {
  findByProject: (projectId: string) => Promise<MemoryContextRecord | null>;
  upsert: (args: { projectId: string; content: string }) => Promise<MemoryContextRecord>;
};
