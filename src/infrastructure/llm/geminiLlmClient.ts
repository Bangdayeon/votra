import "server-only";

import type { LlmClient } from "@/application/ports/llmClient";
import {
  GEMINI_ERROR_MESSAGES,
  geminiMessageForFinishReason,
  geminiMessageForStatus,
} from "@/domain/llm/errorMessages";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const DEFAULT_MAX_TOKENS = 4096;
const TIMEOUT_MS = 30_000;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
};

export const geminiLlmClient: LlmClient = {
  async complete({ system, prompt, maxTokens, responseFormat }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error(GEMINI_ERROR_MESSAGES.UNAUTHORIZED);

    const useJson = responseFormat !== "text";

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        signal: abort.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
            // gemini-2.5-flash 는 thinking 토큰을 출력 한도에서 소비해요.
            // 끄지 않으면 실제 응답이 중간에 잘려요.
            thinkingConfig: { thinkingBudget: 0 },
            ...(useJson ? { responseMimeType: "application/json" } : {}),
          },
        }),
      });
    } catch (err) {
      clearTimeout(timer);
      if (abort.signal.aborted) throw new Error("AI 분석 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.");
      throw err;
    }
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(geminiMessageForStatus(res.status, body));
    }

    const data = (await res.json()) as GeminiResponse;
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    if (finishReason && finishReason !== "STOP") {
      throw new Error(geminiMessageForFinishReason(finishReason));
    }
    if (!text) throw new Error(GEMINI_ERROR_MESSAGES.UNKNOWN);
    return text;
  },
};
