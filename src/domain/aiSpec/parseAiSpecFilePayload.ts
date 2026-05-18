import {
  AI_SPEC_FILE_MAX_BYTES,
  AI_SPEC_FILE_NAME_MAX,
  type AiSpecFile,
} from "@/domain/aiSpec/types";

export type ParsedAiSpecFile =
  | { ok: true; value: AiSpecFile | null }
  | { ok: false; error: string };

export function parseAiSpecFilePayload(raw: unknown): ParsedAiSpecFile {
  if (raw === null) return { ok: true, value: null };
  if (!isRecord(raw)) {
    return { ok: false, error: "aiSpecFile 형식이 잘못됐어요." };
  }
  if (typeof raw.name !== "string" || raw.name.length === 0) {
    return { ok: false, error: "파일 이름이 비어 있어요." };
  }
  if (raw.name.length > AI_SPEC_FILE_NAME_MAX) {
    return { ok: false, error: "파일 이름이 너무 길어요." };
  }
  if (typeof raw.content !== "string") {
    return { ok: false, error: "파일 내용이 문자열이 아니에요." };
  }
  if (raw.content.length > AI_SPEC_FILE_MAX_BYTES) {
    return { ok: false, error: "파일이 너무 커요 (최대 512KB)." };
  }
  return { ok: true, value: { name: raw.name, content: raw.content } };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
