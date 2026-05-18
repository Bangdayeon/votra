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

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
};

export const geminiLlmClient: LlmClient = {
  async complete({ system, prompt, maxTokens }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error(GEMINI_ERROR_MESSAGES.UNAUTHORIZED);

    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
          responseMimeType: "application/json",
          // gemini-2.5-flash 는 기본적으로 thinking 토큰을 출력 한도에서 먹어요.
          // 끄지 않으면 실제 JSON 이 중간에 잘려요.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

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
