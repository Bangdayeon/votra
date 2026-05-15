import type {
  ClaudeFileKind,
  ClaudeFileScope,
} from "@/domain/claudeFiles/types";

export type ClaudeFileInput = {
  kind: ClaudeFileKind;
  scope: ClaudeFileScope;
  absPath: string;
  displayPath: string;
  content: string;
  /** epoch ms */
  mtime: number;
};

export type ClaudeFileRow = ClaudeFileInput;

export type ClaudeFileRepository = {
  findByProject: (projectId: string) => Promise<ClaudeFileRow[]>;
  /** 프로젝트 한 번 스캔의 결과로 통째로 교체. 일부 갱신은 지원 안 함. */
  replaceAll: (projectId: string, files: ClaudeFileInput[]) => Promise<void>;
};
