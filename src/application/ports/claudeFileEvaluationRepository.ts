import type {
  AiScores,
  AiSuggestions,
  ClaudeFileEvaluationStatus,
  ClaudeFileSeverity,
  EvaluationCriteria,
  GlobalPolicyViolation,
} from "@/domain/claudeFiles/types";

export type ClaudeFileEvaluationRow = {
  absPath: string;
  status: ClaudeFileEvaluationStatus;
  severity: ClaudeFileSeverity | null;
  errorMessage: string | null;
  aiReason: string | null;
  scores: AiScores | null;
  suggestions: AiSuggestions | null;
  criteria: EvaluationCriteria;
  globalPolicyHash: string | null;
  globalPolicyViolation: GlobalPolicyViolation | null;
  evaluatedAt: number | null;
};

export type ClaudeFileEvaluationUpsert = {
  projectId: string;
  absPath: string;
  status: ClaudeFileEvaluationStatus;
  severity: ClaudeFileSeverity | null;
  errorMessage: string | null;
  aiReason: string | null;
  scores: AiScores | null;
  suggestions: AiSuggestions | null;
  criteria: EvaluationCriteria;
  globalPolicyHash: string | null;
  globalPolicyViolation: GlobalPolicyViolation | null;
  evaluatedAt: number | null;
};

export type ClaudeFileEvaluationRepository = {
  findByProject: (projectId: string) => Promise<ClaudeFileEvaluationRow[]>;
  upsertMany: (rows: ClaudeFileEvaluationUpsert[]) => Promise<void>;
};
