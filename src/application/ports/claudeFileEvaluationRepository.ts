import type {
  ClaudeFileEvaluationStatus,
  ClaudeFileSeverity,
  EvaluationCriteria,
} from "@/domain/claudeFiles/types";

export type ClaudeFileEvaluationRow = {
  absPath: string;
  status: ClaudeFileEvaluationStatus;
  severity: ClaudeFileSeverity | null;
  errorMessage: string | null;
  criteria: EvaluationCriteria;
  evaluatedAt: number | null;
};

export type ClaudeFileEvaluationUpsert = {
  projectId: string;
  absPath: string;
  status: ClaudeFileEvaluationStatus;
  severity: ClaudeFileSeverity | null;
  errorMessage: string | null;
  criteria: EvaluationCriteria;
  evaluatedAt: number | null;
};

export type ClaudeFileEvaluationRepository = {
  findByProject: (projectId: string) => Promise<ClaudeFileEvaluationRow[]>;
  upsertMany: (rows: ClaudeFileEvaluationUpsert[]) => Promise<void>;
};
