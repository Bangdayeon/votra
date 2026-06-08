/**
 * keyDecisions 또는 outcome이 있는 완료 태스크에 벡터 임베딩을 생성·저장하는 일회성 스크립트.
 *
 * 실행: node --env-file=.env scripts/backfill-task-embeddings.mjs
 */

import { PrismaClient } from "@prisma/client";

const EMBED_MODEL = "gemini-embedding-001";
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 1000;

const prisma = new PrismaClient();

async function embed(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되지 않았어요.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 768,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`임베딩 API 오류 (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.embedding?.values ?? [];
}

function buildEmbeddingText(task) {
  const parts = [
    `유저 요구: ${task.title}`,
    task.keyDecisions.length > 0 ? `핵심 결정: ${task.keyDecisions.join(". ")}` : "",
    task.outcome ? `결론: ${task.outcome}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

async function main() {
  const tasks = await prisma.$queryRaw`
    SELECT id, title, "keyDecisions", outcome
    FROM "Task"
    WHERE "deletedAt" IS NULL
      AND "embedding" IS NULL
      AND (array_length("keyDecisions", 1) > 0 OR outcome IS NOT NULL)
    ORDER BY "doneAt" DESC NULLS LAST
  `;

  console.log(`총 ${tasks.length}개 태스크 처리 시작`);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (task) => {
        try {
          const text = buildEmbeddingText(task);
          const embedding = await embed(text);
          await prisma.$executeRaw`
            UPDATE "Task" SET "embedding" = ${embedding}::vector WHERE id = ${task.id}
          `;
          processed++;
        } catch (err) {
          console.error(`태스크 ${task.id} 실패:`, err.message);
          failed++;
        }
      }),
    );

    console.log(`진행: ${Math.min(i + BATCH_SIZE, tasks.length)} / ${tasks.length}`);

    if (i + BATCH_SIZE < tasks.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`완료: ${processed}개 성공, ${failed}개 실패`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
