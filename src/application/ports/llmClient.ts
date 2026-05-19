export type LlmCompletionInput = {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** "json": JSON 응답 강제 (기본값). "text": 자유 텍스트 응답. */
  responseFormat?: "json" | "text";
};

export type LlmClient = {
  complete: (input: LlmCompletionInput) => Promise<string>;
};
