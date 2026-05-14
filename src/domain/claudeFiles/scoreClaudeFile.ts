import type { ClaudeFileKind, ClaudeFileScore } from "@/domain/claudeFiles/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const COMMAND_KEYWORDS = [
  "npm",
  "pnpm",
  "yarn",
  "npx",
  "make",
  "bun",
  "git",
  "prisma",
  "cargo",
  "go ",
  "python",
];

const PATTERN_KEYWORDS = [
  "gotcha",
  "주의",
  "warning",
  "do not",
  "never",
  "must",
  "반드시",
  "금지",
];

const ARCHITECTURE_KEYWORDS = [
  "domain",
  "application",
  "infrastructure",
  "layer",
  "module",
];

const ACTION_LEAD_VERBS = [
  "use",
  "run",
  "do",
  "avoid",
  "prefer",
  "쓰지",
  "쓰세요",
  "하세요",
  "마세요",
  "넣어",
];

export function scoreClaudeFile(
  content: string,
  kind: ClaudeFileKind,
  mtimeMs: number,
  nowMs: number = Date.now(),
): ClaudeFileScore {
  const { body, frontmatter } = splitFrontmatter(content);
  const lower = body.toLowerCase();

  const commands = scoreCommands(body, lower);
  let architecture = scoreArchitecture(body, lower);
  const patternsBase = scorePatterns(lower);
  let patterns = patternsBase;
  const conciseness = scoreConciseness(body);
  const currency = scoreCurrency(mtimeMs, nowMs);
  let actionability = scoreActionability(body);

  if (kind === "SKILL" && frontmatter !== null) {
    const fm = frontmatter.toLowerCase();
    if (/\bname\s*:/.test(fm)) {
      architecture = Math.min(20, architecture + 4);
    }
    const descMatch = frontmatter.match(/description\s*:\s*(.+)/i);
    if (descMatch) {
      const descLen = descMatch[1].trim().length;
      if (descLen >= 50 && descLen <= 300) {
        actionability = Math.min(15, actionability + 3);
      }
    }
    if (/trigger|when to use/i.test(content)) {
      patterns = Math.min(15, patterns + 3);
    }
  }

  const total =
    commands + architecture + patterns + conciseness + currency + actionability;

  return {
    commands,
    architecture,
    patterns,
    conciseness,
    currency,
    actionability,
    total,
  };
}

function splitFrontmatter(content: string): {
  frontmatter: string | null;
  body: string;
} {
  if (!content.startsWith("---")) return { frontmatter: null, body: content };
  const end = content.indexOf("\n---", 3);
  if (end < 0) return { frontmatter: null, body: content };
  const frontmatter = content.slice(3, end);
  const body = content.slice(end + 4).replace(/^\n/, "");
  return { frontmatter, body };
}

function scoreCommands(body: string, lower: string): number {
  let score = 0;
  const fenceCount = (body.match(/```/g)?.length ?? 0) / 2;
  if (fenceCount >= 3) score += 8;

  let kwHits = 0;
  for (const kw of COMMAND_KEYWORDS) if (lower.includes(kw)) kwHits += 1;
  if (kwHits >= 3) score += 8;

  const promptLineCount = (body.match(/^[ \t]*[$>][ \t]+/gm)?.length ?? 0);
  if (promptLineCount >= 2) score += 4;

  return Math.min(20, score);
}

function scoreArchitecture(body: string, lower: string): number {
  let score = 0;
  const headerCount = body.match(/^(##|###)\s+/gm)?.length ?? 0;
  if (headerCount >= 3) score += 6;

  const treeChars = /[├└]─|[│┃][ \t]|^[ \t]*[A-Za-z0-9_.-]+\/\s*$/m.test(body);
  if (treeChars) score += 6;

  let archHits = 0;
  for (const kw of ARCHITECTURE_KEYWORDS) if (lower.includes(kw)) archHits += 1;
  if (archHits >= 2) score += 4;

  if (/```mermaid/i.test(body)) score += 4;
  return Math.min(20, score);
}

function scorePatterns(lower: string): number {
  let hits = 0;
  for (const kw of PATTERN_KEYWORDS) {
    const matches = lower.match(new RegExp(escapeRegex(kw), "g"));
    if (matches) hits += matches.length;
  }
  return Math.min(15, hits * 3);
}

function scoreConciseness(body: string): number {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount <= 300) return 15;
  if (wordCount <= 800) return 12;
  if (wordCount <= 1500) return 8;
  if (wordCount <= 3000) return 4;
  return 0;
}

function scoreCurrency(mtimeMs: number, nowMs: number): number {
  const ageDays = (nowMs - mtimeMs) / DAY_MS;
  if (ageDays < 30) return 15;
  if (ageDays < 90) return 10;
  if (ageDays < 180) return 6;
  if (ageDays < 365) return 3;
  return 0;
}

function scoreActionability(body: string): number {
  let score = 0;
  const bulletCount = body.match(/^[ \t]*([-*]|\d+\.)[ \t]+/gm)?.length ?? 0;
  if (bulletCount >= 5) score += 6;

  let verbHits = 0;
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    for (const verb of ACTION_LEAD_VERBS) {
      if (trimmed.startsWith(verb)) {
        verbHits += 1;
        break;
      }
    }
  }
  if (verbHits >= 3) score += 5;

  if ((body.match(/```/g)?.length ?? 0) >= 2) score += 4;
  return Math.min(15, score);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
