export type EmbeddingClient = {
  embed: (text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") => Promise<number[]>;
};
