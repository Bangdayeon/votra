import "server-only";

import type { EmbeddingClient } from "@/application/ports/embeddingClient";

const EMBED_MODEL = "gemini-embedding-001";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;
const TIMEOUT_MS = 10_000;

type GeminiEmbedResponse = {
  embedding?: { values?: number[] };
};

export const geminiEmbeddingClient: EmbeddingClient = {
  async embed(text, taskType) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았어요.");

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        signal: abort.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: 768,
        }),
      });
    } catch (err) {
      clearTimeout(timer);
      if (abort.signal.aborted) throw new Error("임베딩 요청 시간이 초과됐어요.");
      throw err;
    }
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`임베딩 API 오류 (${res.status}): ${body}`);
    }

    const data = (await res.json()) as GeminiEmbedResponse;
    const values = data.embedding?.values;
    if (!values || values.length === 0) throw new Error("임베딩 값이 비어 있어요.");

    return values;
  },
};
