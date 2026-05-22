import type { ThoughtRecord } from "@/domain/memory/types";

export type ThoughtCreateInput = {
  content: string;
  tags: string[];
  embedding: number[];
  projectId: string;
  userId: string;
};

export type ThoughtSearchInput = {
  queryEmbedding: number[];
  projectId: string;
  userId: string;
  limit: number;
  minSimilarity?: number;
};

export type ThoughtSearchRow = ThoughtRecord & { similarity: number };

export type ThoughtRepository = {
  create: (input: ThoughtCreateInput) => Promise<ThoughtRecord>;
  search: (input: ThoughtSearchInput) => Promise<ThoughtSearchRow[]>;
  listRecent: (args: {
    projectId: string;
    userId: string;
    limit: number;
  }) => Promise<ThoughtRecord[]>;
};
