-- Task 벡터 임베딩 컬럼 추가 (768차원, Gemini embedding-001)
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "embedding" vector(768);

-- 벡터 유사도 검색용 HNSW 인덱스
CREATE INDEX IF NOT EXISTS "task_embedding_idx" ON "Task" USING hnsw ("embedding" vector_cosine_ops);

-- keyDecisions 배열 텍스트 검색용 GIN 인덱스
CREATE INDEX IF NOT EXISTS "task_key_decisions_gin_idx" ON "Task" USING GIN ("keyDecisions");
