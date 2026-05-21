import { claudeCodeAdapter } from "./claudeCode";
import { codexAdapter } from "./codex";
import { geminiAdapter } from "./gemini";
import type { AgentAdapter } from "./types";

/**
 * 등록된 agent 어댑터 목록. 새 agent 추가 시 여기에 push.
 */
export const AGENT_ADAPTERS: AgentAdapter[] = [geminiAdapter, codexAdapter, claudeCodeAdapter];
