import type { ClaudeFileKind, ClaudeFileScore } from "@/domain/claudeFiles/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const BUILD_TEST_LINT_DEPLOY = [
  "build",
  "test",
  "lint",
  "typecheck",
  "type-check",
  "dev",
  "start",
  "deploy",
  "format",
  "check",
];

const COMMAND_RUNNERS = [
  "npm",
  "pnpm",
  "yarn",
  "npx",
  "bun",
  "make",
  "cargo",
  "prisma",
  "docker",
  "git",
];

const ARCHITECTURE_KEYWORDS = [
  "domain",
  "application",
  "infrastructure",
  "layer",
  "module",
  "entry",
  "route",
  "boundary",
];

const PATTERN_MARKERS_EN = [
  "gotcha",
  "warning",
  "caveat",
  "note:",
  "why:",
  "forbidden",
  "do not",
  "don't",
  "never",
  "must not",
  "always",
];

const PATTERN_MARKERS_KO = [
  "주의",
  "반드시",
  "금지",
  "하지 마",
  "쓰지 마",
  "절대",
  "이유:",
  "왜:",
];

const ACTION_LEAD_VERBS = [
  "use",
  "run",
  "do",
  "avoid",
  "prefer",
  "add",
  "remove",
  "set",
  "ensure",
  "check",
  "verify",
  "쓰지",
  "쓰세요",
  "하세요",
  "마세요",
  "넣어",
  "확인",
  "사용",
];

export function scoreClaudeFile(
  content: string,
  kind: ClaudeFileKind,
  mtimeMs: number,
  nowMs: number = Date.now(),
): ClaudeFileScore {
  const { body, frontmatter } = splitFrontmatter(content);
  const lower = body.toLowerCase();

  const commands = scoreCommands(body);
  let architecture = scoreArchitecture(body, lower);
  let patterns = scorePatterns(body, lower);
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

/** Commands/Workflows: build/test/lint/deploy 명령이 실제 실행 가능한 형태로 문서화돼 있는지 */
function scoreCommands(body: string): number {
  const fences = extractFencedBlocks(body);
  const shellFences = fences.filter((f) =>
    /^(bash|sh|shell|zsh|console|terminal)\b/i.test(f.lang ?? ""),
  );

  // 인라인 백틱 안의 command-like 토큰도 수집 — 산문에 명령 박혀 있는 흔한 패턴
  const inlineCodeSnippets: string[] = [];
  const inlineRe = /`([^`\n]+)`/g;
  let im: RegExpExecArray | null;
  while ((im = inlineRe.exec(body)) !== null) inlineCodeSnippets.push(im[1]);

  const shellLines = shellFences
    .flatMap((f) => f.body.split("\n"))
    .map((l) => l.replace(/^[$>][ \t]+/, "").trim())
    .filter(Boolean);

  let score = 0;

  // 1) runner 매치 (shell fence 기준 full, 인라인은 절반 weight) — 최대 8점
  const fenceRunners = new Set<string>();
  for (const line of shellLines) {
    for (const r of COMMAND_RUNNERS) {
      if (new RegExp(`^${escapeRegex(r)}\\b`).test(line)) {
        fenceRunners.add(r);
        break;
      }
    }
  }
  const inlineRunners = new Set<string>();
  for (const snip of inlineCodeSnippets) {
    const trimmed = snip.trim();
    for (const r of COMMAND_RUNNERS) {
      if (new RegExp(`^${escapeRegex(r)}\\b`).test(trimmed)) {
        inlineRunners.add(r);
        break;
      }
    }
  }
  if (fenceRunners.size >= 2) score += 8;
  else if (fenceRunners.size === 1) score += 5;
  else if (inlineRunners.size >= 2) score += 5;
  else if (inlineRunners.size === 1) score += 3;

  // 2) build/test/lint/deploy 의도 커버리지 — 최대 8점
  const intentHits = new Set<string>();
  for (const line of shellLines) {
    for (const intent of BUILD_TEST_LINT_DEPLOY) {
      if (new RegExp(`\\b${escapeRegex(intent)}\\b`).test(line)) intentHits.add(intent);
    }
  }
  for (const snip of inlineCodeSnippets) {
    for (const intent of BUILD_TEST_LINT_DEPLOY) {
      if (new RegExp(`\\b${escapeRegex(intent)}\\b`, "i").test(snip)) intentHits.add(intent);
    }
  }
  if (intentHits.size >= 3) score += 8;
  else if (intentHits.size === 2) score += 6;
  else if (intentHits.size === 1) score += 3;

  // 3) 명령에 설명 컨텍스트가 붙어 있는지 — 최대 4점
  // shell fence 앞 줄이 헤더/설명이면 인정. 인라인 명령이 한 문장 안에 있으면 컨텍스트로 간주.
  let withContext = 0;
  for (const fence of shellFences) {
    const before = body.slice(0, fence.start).trimEnd().split("\n").slice(-3);
    if (before.some((l) => /^(#+\s|\*\*|- )/.test(l) || l.length > 20)) withContext += 1;
  }
  if (shellFences.length === 0 && inlineRunners.size > 0) {
    // 산문 + 인라인 명령: 백틱이 문장 일부면 컨텍스트 있음으로 간주
    const proseWithInline = body
      .split("\n")
      .filter((l) => /`[^`]+`/.test(l) && l.replace(/`[^`]+`/g, "").trim().length > 10);
    if (proseWithInline.length >= 2) withContext += 2;
    else if (proseWithInline.length === 1) withContext += 1;
  }
  if (withContext >= 2) score += 4;
  else if (withContext === 1) score += 2;

  return Math.min(20, score);
}

/** Architecture: 디렉토리 구조 + 모듈 관계 + 진입점이 설명돼 있는지 */
function scoreArchitecture(body: string, lower: string): number {
  let score = 0;

  // 트리 문자 (├─ └─ │) — 가장 강한 신호
  const treeChars = /[├└]─|[│┃][ \t]/m.test(body);
  if (treeChars) score += 7;

  // 디렉토리 listing (`src/...`, `path/`) 라인 ≥4 — 트리 없어도 인정
  const dirListingLines = (body.match(/^[ \t]*[A-Za-z_][\w./-]*\/\s*(?:#.*)?$/gm) ?? []).length;
  if (!treeChars && dirListingLines >= 4) score += 5;

  // 아키텍처 어휘 다양도
  let archHits = 0;
  for (const kw of ARCHITECTURE_KEYWORDS) {
    if (new RegExp(`\\b${escapeRegex(kw)}\\b`).test(lower)) archHits += 1;
  }
  if (archHits >= 3) score += 6;
  else if (archHits >= 1) score += 3;

  // 의존 방향 / 진입점 설명
  if (/→|->|depends on|depend on|import.*from|entry point|진입점|의존 방향/i.test(body))
    score += 3;

  // mermaid 다이어그램
  if (/```mermaid/i.test(body)) score += 4;

  // 헤더 다양성 (보조 신호 — 너무 쉬워서 가중치 낮춤)
  const headerCount = body.match(/^(##|###)\s+/gm)?.length ?? 0;
  if (headerCount >= 4) score += 2;

  return Math.min(20, score);
}

/** Non-Obvious Patterns: gotcha / 금지사항 / "왜 이렇게" / 워크어라운드 */
function scorePatterns(body: string, lower: string): number {
  let hits = 0;
  for (const kw of PATTERN_MARKERS_EN) {
    const matches = lower.match(new RegExp(escapeRegex(kw), "g"));
    if (matches) hits += matches.length;
  }
  for (const kw of PATTERN_MARKERS_KO) {
    const matches = body.match(new RegExp(escapeRegex(kw), "g"));
    if (matches) hits += matches.length;
  }

  // 헤더로 "Forbidden" / "Gotchas" / "주의사항" 같은 명시적 섹션이 있으면 가산
  if (/^#+\s+(forbidden|gotchas?|warnings?|caveats?|주의|금지|규칙)/im.test(body)) {
    hits += 2;
  }

  // 점수 환산: 적은 hit 도 빠르게 부분 점수 주고, 많아지면 saturate
  if (hits >= 8) return 15;
  if (hits >= 5) return 12;
  if (hits >= 3) return 9;
  if (hits >= 2) return 6;
  if (hits >= 1) return 3;
  return 0;
}

/** Conciseness: 빽빽하고 가치 있는 내용인지 */
function scoreConciseness(body: string): number {
  const trimmed = body.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return 0;

  let base: number;
  if (wordCount <= 300) base = 15;
  else if (wordCount <= 800) base = 13;
  else if (wordCount <= 1500) base = 9;
  else if (wordCount <= 3000) base = 5;
  else base = 1;

  // 헤더 대비 내용 비율 sanity check — 헤더만 많고 내용 빈약하면 감점
  const headerCount = body.match(/^(#+)\s+/gm)?.length ?? 0;
  if (headerCount > 0) {
    const wordsPerHeader = wordCount / headerCount;
    if (wordsPerHeader < 10) base = Math.max(0, base - 4);
  }

  return base;
}

/** Currency: mtime 기반 */
function scoreCurrency(mtimeMs: number, nowMs: number): number {
  const ageDays = (nowMs - mtimeMs) / DAY_MS;
  if (ageDays < 30) return 15;
  if (ageDays < 90) return 10;
  if (ageDays < 180) return 6;
  if (ageDays < 365) return 3;
  return 0;
}

/** Actionability: 복붙 가능한 명령, 구체적 단계, 명령형 표현 */
function scoreActionability(body: string): number {
  let score = 0;

  // 1) 불릿/번호 단계 (4점)
  const bulletCount = body.match(/^[ \t]*([-*]|\d+\.)[ \t]+/gm)?.length ?? 0;
  if (bulletCount >= 5) score += 4;
  else if (bulletCount >= 2) score += 2;

  // 2) 명령형 라인 — 긍정 동사 OR 부정 명령 ("Don't", "No X.", "Never X") 양쪽 인정 (5점)
  let imperativeHits = 0;
  for (const rawLine of body.split("\n")) {
    const stripped = rawLine.replace(/^[ \t]*([-*]|\d+\.)[ \t]+/, "").trim();
    const lower = stripped.toLowerCase();
    let matched = false;
    for (const verb of ACTION_LEAD_VERBS) {
      if (new RegExp(`^${escapeRegex(verb)}\\b`).test(lower)) {
        matched = true;
        break;
      }
    }
    if (!matched && /^(don'?t|never|no\b|avoid|forbidden|do not|skip|stop)\b/i.test(stripped)) {
      matched = true;
    }
    if (matched) imperativeHits += 1;
  }
  if (imperativeHits >= 6) score += 5;
  else if (imperativeHits >= 3) score += 4;
  else if (imperativeHits >= 1) score += 2;

  // 3) 실행 가능한 코드 fence (3점)
  const fencePairs = Math.floor((body.match(/```/g)?.length ?? 0) / 2);
  if (fencePairs >= 2) score += 3;
  else if (fencePairs >= 1) score += 2;

  // 4) 구체적 경로 / 식별자 인용 (3점) — 가중치 낮춤
  const pathHits =
    (body.match(/`@\/[\w./-]+`|`\.\/[\w./-]+`|`[\w-]+\/[\w./-]+\.\w+`/g) ?? []).length;
  if (pathHits >= 3) score += 3;
  else if (pathHits >= 1) score += 2;

  return Math.min(15, score);
}

type FencedBlock = { lang: string | null; body: string; start: number; end: number };

function extractFencedBlocks(body: string): FencedBlock[] {
  const blocks: FencedBlock[] = [];
  const re = /```([\w-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    blocks.push({
      lang: m[1] || null,
      body: m[2],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return blocks;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
