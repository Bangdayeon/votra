import { AGENT_ADAPTERS } from "./registry";
import type { AgentAdapter, FolderFile } from "./types";

export function detectAgent(files: FolderFile[]): AgentAdapter | null {
  for (const adapter of AGENT_ADAPTERS) {
    if (adapter.detect(files)) return adapter;
  }
  return null;
}
