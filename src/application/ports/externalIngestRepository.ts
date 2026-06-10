export type ExternalIngestRecord = {
  id: string;
  projectId: string;
  source: string;
  content: string;
  contentHash: string;
  sourceUrl: string | null;
  metadata: Record<string, unknown> | null;
  processedAt: Date | null;
  createdAt: Date;
};

export type CreateExternalIngestInput = {
  projectId: string;
  source: string;
  content: string;
  contentHash: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
};

export type ExternalIngestRepository = {
  upsert: (input: CreateExternalIngestInput) => Promise<{ record: ExternalIngestRecord; duplicate: boolean }>;
  listUnprocessed: (args: { projectId: string; limit: number }) => Promise<ExternalIngestRecord[]>;
  markProcessed: (ids: string[]) => Promise<void>;
  deleteOld: (args: { processedBefore: Date; unprocessedBefore: Date }) => Promise<number>;
};
