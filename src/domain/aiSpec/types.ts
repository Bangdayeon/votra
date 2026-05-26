export const AI_SPEC_GUIDELINE_MAX = 8000;
export const AI_SPEC_FILE_MAX_BYTES = 512 * 1024;
export const AI_SPEC_FILE_NAME_MAX = 255;

/**
 * 계정의 "전체 정책" 기본값. 가입 시 채워지고, 이미 가입된 계정에는 마이그레이션으로 backfill 돼요.
 * 모달은 DB 값을 그대로 보여주므로 사용자가 비워두면 빈 textarea 가 보여요 — 기본값을 다시 받고
 * 싶으면 "계정 초기화" 를 통해 정책이 null 로 비워진 뒤 다음 가입/upsert 시 복구돼요.
 */
export const DEFAULT_AI_POLICY_TEXT = `# AI 스펙 운영 정책

_AI 코딩 세션이 스펙 문서의 의도대로 진행됐는지
검토하기 위한 공통 기준입니다._

## 1. 스펙 문서 구성

- 모든 프로젝트에 CLAUDE.md 또는 AGENTS.md가 존재해야 한다
- 스펙 문서에 프로젝트 구조와 주요 설계 원칙이 포함되어야 한다

## 2. 세션 범위

- 하나의 세션은 하나의 목적을 가져야 한다
- 세션 시작 시 AI가 작업 계획을 먼저 제시해야 한다
- 스펙에 정의되지 않은 영역을 AI가 임의로 수정하지 않아야 한다

## 3. 스펙 준수

- AI가 스펙 문서의 금지 항목을 위반하지 않아야 한다
- 스펙과 충돌하는 작업 요청 시 AI가 확인을 요청해야 한다
- 스펙에 명시된 아키텍처 패턴을 벗어나지 않아야 한다

## 4. 스펙 문서 최신화

- 프로젝트 구조가 변경될 경우 스펙 문서도 함께 업데이트해야 한다
- 반복적으로 위반되는 항목은 스펙 문서에 명시적으로 추가한다
`;

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
