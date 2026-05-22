-- Task.seq: 사람이 읽기 쉬운 순번 (#42 형태로 참조)
-- SERIAL = autoincrement + NOT NULL + DEFAULT nextval
ALTER TABLE "Task" ADD COLUMN "seq" SERIAL;
CREATE UNIQUE INDEX "Task_seq_key" ON "Task"("seq");
