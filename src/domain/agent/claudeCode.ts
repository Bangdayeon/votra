import { parseJsonl } from "@/domain/session/parseJsonl";
import type { Session } from "@/domain/session/types";

import { ROLLOUT_FILE } from "./codex";
import type { AgentAdapter, FolderFile } from "./types";

const CLAUDE_PATH_HINT = /(^|\/)\.claude\/projects\/[^/]+\/[^/]+\.jsonl$/i;

function isClaudeJsonl(file: FolderFile): boolean {
  if (CLAUDE_PATH_HINT.test(file.relativePath)) return true;
  if (ROLLOUT_FILE.test(file.relativePath)) return false;
  return file.relativePath.toLowerCase().endsWith(".jsonl");
}

export const claudeCodeAdapter: AgentAdapter = {
  kind: "CLAUDE",
  label: "Claude Code",
  detect(files) {
    return files.some(isClaudeJsonl);
  },
  async parse(files) {
    const targets = files.filter(isClaudeJsonl);
    const sessions: Session[] = [];
    for (const file of targets) {
      const text = await file.readText();
      sessions.push(...parseJsonl(text));
    }
    return sessions;
  },
};
