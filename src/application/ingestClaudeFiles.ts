import type {
  ClaudeFileInput,
  ClaudeFileRepository,
} from "@/application/ports/claudeFileRepository";

export type IngestClaudeFilesInput = {
  projectId: string;
  files: ClaudeFileInput[];
};

export async function ingestClaudeFiles(
  input: IngestClaudeFilesInput,
  deps: { claudeFiles: ClaudeFileRepository },
): Promise<void> {
  await deps.claudeFiles.replaceAll(input.projectId, input.files);
}
