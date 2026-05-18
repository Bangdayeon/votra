export const AI_SPEC_GUIDELINE_MAX = 8000;
export const AI_SPEC_FILE_MAX_BYTES = 512 * 1024;
export const AI_SPEC_FILE_NAME_MAX = 255;

export type AiSpecFile = {
  name: string;
  content: string;
};

/**
 * 업로드 파일의 변경 의도.
 * - "none": 그대로 둠 (서버로 보내지 않음)
 * - "upload": 새 파일로 교체 (저장 시 업로드)
 * - "remove": 기존 파일 제거
 */
export type AiSpecFileChange =
  | { kind: "none" }
  | ({ kind: "upload" } & AiSpecFile)
  | { kind: "remove" };

export type AiSpecPolicyPatch = {
  aiSpecGuideline: string;
  /** undefined: 파일 변경 없음 */
  aiSpecFile?: AiSpecFile | null;
};

export function buildAiSpecPolicyPatch(
  guideline: string,
  fileChange: AiSpecFileChange,
): AiSpecPolicyPatch {
  const patch: AiSpecPolicyPatch = { aiSpecGuideline: guideline };
  if (fileChange.kind === "upload") {
    patch.aiSpecFile = { name: fileChange.name, content: fileChange.content };
  } else if (fileChange.kind === "remove") {
    patch.aiSpecFile = null;
  }
  return patch;
}
