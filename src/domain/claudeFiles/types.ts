export type ClaudeFileKind = "CLAUDE" | "AGENTS" | "SKILL";

export type ClaudeFileScope = "global" | "project-root" | "subdir";

export type ClaudeFileGrade = "A" | "B" | "C" | "D" | "F";

/** 6 criteria × max points. claude-md-management rubric 기준. */
export type ClaudeFileScore = {
  commands: number; // /20
  architecture: number; // /20
  patterns: number; // /15
  conciseness: number; // /15
  currency: number; // /15
  actionability: number; // /15
  total: number; // /100
};

export type ClaudeFileRecord = {
  /** OS 절대 경로 */
  absPath: string;
  /** scope 안에서의 보기용 상대 경로 (전역: ~/.claude/..., 프로젝트: 파일명, 서브: cwd 기준 상대경로) */
  displayPath: string;
  kind: ClaudeFileKind;
  scope: ClaudeFileScope;
  contentLength: number;
  /** epoch ms */
  mtime: number;
  score: ClaudeFileScore;
  grade: ClaudeFileGrade;
};
