export type EmbeddingClient = {
  embed: (text: string) => Promise<number[]>;
};
