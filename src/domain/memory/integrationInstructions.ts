export type IntegrationInstruction = {
  source: string;
  mcpTools: string[];
  instruction: string;
};

export const INTEGRATION_INSTRUCTIONS: Record<string, IntegrationInstruction> = {
  notion: {
    source: "notion",
    mcpTools: [
      "mcp__notionhq__retrieve-page",
      "mcp__notionhq__search",
      "mcp__notionhq__retrieve-block-children",
    ],
    instruction:
      'Notion MCP로 페이지·데이터베이스를 읽은 후, 핵심 결정·인사이트·참고 자료가 담긴 내용은 POST /api/memory/ingest 로 전송해 haema 기억에 저장하세요. body: { projectId, source: "notion", content, sourceUrl? }',
  },
  slack: {
    source: "slack",
    mcpTools: ["mcp__slack__get-messages", "mcp__slack__search"],
    instruction:
      'Slack MCP로 채널 메시지를 읽은 후, 중요한 결정이나 논의 결과는 POST /api/memory/ingest 로 전송하세요. body: { projectId, source: "slack", content, sourceUrl? }',
  },
  github: {
    source: "github",
    mcpTools: [
      "mcp__github__get-issue",
      "mcp__github__get-pull-request",
      "mcp__github__search-issues",
    ],
    instruction:
      'GitHub MCP로 이슈·PR을 읽은 후, 설계 결정이나 중요한 토론 내용은 POST /api/memory/ingest 로 전송하세요. body: { projectId, source: "github", content, sourceUrl? }',
  },
  linear: {
    source: "linear",
    mcpTools: ["mcp__linear__get-issue", "mcp__linear__search-issues"],
    instruction:
      'Linear MCP로 티켓을 읽은 후, 결정사항이나 구현 맥락은 POST /api/memory/ingest 로 전송하세요. body: { projectId, source: "linear", content, sourceUrl? }',
  },
};
