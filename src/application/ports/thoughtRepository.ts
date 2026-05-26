import type { ThoughtRecord } from "@/domain/memory/types";

export type ThoughtCreateInput = {
  content: string;
  tags: string[];
  projectId: string;
  userId: string;
};

export type ThoughtSearchInput = {
  query: string;
  projectId: string;
  userId: string;
  limit: number;
};

export type ThoughtRepository = {
  create: (input: ThoughtCreateInput) => Promise<ThoughtRecord>;
  search: (input: ThoughtSearchInput) => Promise<ThoughtRecord[]>;
  listRecent: (args: {
    projectId: string;
    userId: string;
    limit: number;
  }) => Promise<ThoughtRecord[]>;
  listByTags: (args: {
    projectId: string;
    userId: string;
    tags: string[];
    limit: number;
  }) => Promise<ThoughtRecord[]>;
};
