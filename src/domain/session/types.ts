export type AssistantUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: unknown;
      is_error?: boolean;
    };

export type RawMessage = {
  role?: "user" | "assistant";
  content?: string | ContentBlock[];
  usage?: AssistantUsage;
  model?: string;
};

/**
 * Claude Code .jsonl 한 라인의 raw 구조.
 * 알려지지 않은 type 도 string 으로 통과시키고, 미사용 필드는 unknown 으로 보존.
 */
export type RawEvent = {
  type: string;
  uuid?: string;
  parentUuid?: string | null;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  isSidechain?: boolean;
  userType?: string;
  message?: RawMessage;
  summary?: string;
  leafUuid?: string;
  [key: string]: unknown;
};

export type Session = {
  id: string;
  title: string;
  startedAt?: string;
  endedAt?: string;
  events: RawEvent[];
};
