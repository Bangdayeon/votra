import "server-only";

import type { EmbeddingClient } from "@/application/ports/embeddingClient";

const MODEL = "text-embedding-004";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`;
const EXPECTED_DIMS = 768;

type GeminiEmbedResponse = {
  embedding?: { values?: number[] };
};

export const geminiEmbeddingClient: EmbeddingClient = {
  async embed(text) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY 가 설정되지 않았어요.");

    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini embedding HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as GeminiEmbedResponse;
    const values = data.embedding?.values;
    if (!Array.isArray(values) || values.length !== EXPECTED_DIMS) {
      throw new Error(`Gemini embedding 응답이 유효하지 않아요 (받은 차원: ${values?.length}).`);
    }
    return values;
  },
};
