import type { Session } from "@/domain/session/types";

/**
 * DB 의 AgentSource enum 과 동일 값. 새 agent 추가 시 schema enum + 여기 + 어댑터 등록.
 */
export type AgentKind = "CLAUDE" | "CURSOR" | "CODEX";

/**
 * 업로드된 폴더 한 파일을 추상화한 형태.
 * 서버 fs / 브라우저 File 객체 어느 쪽이든 동일한 인터페이스로 다루도록 lazy reader 분리.
 */
export type FolderFile = {
  /** 폴더 루트 기준 상대 경로 (예: ".claude/projects/abc/123.jsonl") */
  relativePath: string;
  readText: () => Promise<string>;
};

export type AgentAdapter = {
  kind: AgentKind;
  label: string;
  detect: (files: FolderFile[]) => boolean;
  parse: (files: FolderFile[]) => Promise<Session[]>;
};
