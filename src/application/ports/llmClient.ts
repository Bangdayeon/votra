export type LlmCompletionInput = {
  system: string;
  prompt: string;
  maxTokens?: number;
};

export type LlmClient = {
  complete: (input: LlmCompletionInput) => Promise<string>;
};
