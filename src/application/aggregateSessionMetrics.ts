import type { RawEvent } from "@/domain/session/types";

export type SessionMetrics = {
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function aggregateSessionMetrics(events: RawEvent[]): SessionMetrics {
  let inputTokens = 0;
  let outputTokens = 0;
  const modelCount: Record<string, number> = {};

  for (const event of events) {
    if (event.type !== "assistant") continue;
    const usage = event.message?.usage;
    if (usage) {
      inputTokens += usage.input_tokens ?? 0;
      outputTokens += usage.output_tokens ?? 0;
    }
    const model = event.message?.model;
    if (typeof model === "string" && model.length > 0) {
      modelCount[model] = (modelCount[model] ?? 0) + 1;
    }
  }

  const sortedModels = Object.entries(modelCount).sort((a, b) => b[1] - a[1]);
  const topModel = sortedModels[0]?.[0] ?? null;

  return {
    model: topModel,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}
