/**
 * 내 PC 의 CLAUDE.md / AGENTS.md / SKILL.md 들을 배포된 Votra 로 ingest.
 *
 * 사용:
 *   VOTRA_API_KEY=vt_xxx node scripts/push-claude-files.mjs \
 *     --cwd /path/to/project \
 *     --endpoint https://votra.example.com
 *
 * 기본 endpoint 는 http://localhost:3000, cwd 는 process.cwd().
 * 프로젝트 (cwd) 에 해당하는 세션 ingest 가 먼저 끝나 있어야 해요.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "dist",
  "build",
  "out",
  "coverage",
  ".vercel",
]);
const MAX_DEPTH = 8;
const MAX_ENTRIES = 5000;
const MAX_BYTES = 256 * 1024;

const ROOT_FILE_KIND = {
  "CLAUDE.md": "CLAUDE",
  "CLAUDE.local.md": "CLAUDE",
  "AGENTS.md": "AGENTS",
};
const NESTED_FILE_KIND = {
  "CLAUDE.md": "CLAUDE",
  "CLAUDE.local.md": "CLAUDE",
  "AGENTS.md": "AGENTS",
  "SKILL.md": "SKILL",
};

const args = parseArgs(process.argv.slice(2));
const cwd = args.cwd ?? process.cwd();
const endpoint = (args.endpoint ?? process.env.VOTRA_ENDPOINT ?? "http://localhost:3000").replace(/\/$/, "");
const apiKey = process.env.VOTRA_API_KEY;

if (!apiKey) {
  console.error("VOTRA_API_KEY 환경변수가 비어 있어요. scripts/create-api-key.mjs 로 발급하세요.");
  process.exit(2);
}

const discovered = [];
await collectGlobal(discovered);
await collectProjectRoot(discovered, cwd);
await collectSubdir(discovered, cwd);

const files = [];
for (const d of discovered) {
  const file = await readClaudeFile(d.absPath);
  if (!file) continue;
  files.push({ ...d, content: file.content, mtime: file.mtime });
}

if (files.length === 0) {
  console.error("올릴 파일이 없어요. cwd 와 ~/.claude 를 확인해 주세요.");
  process.exit(1);
}

console.log(`cwd:      ${cwd}`);
console.log(`endpoint: ${endpoint}`);
console.log(`files:    ${files.length}`);
for (const f of files) {
  console.log(`  - [${f.kind}/${f.scope}] ${f.displayPath} (${f.content.length}b)`);
}

let res;
try {
  res = await fetch(`${endpoint}/api/claude-files/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ source: cwd, files }),
  });
} catch (err) {
  console.error(`\n✗ ${endpoint} 에 연결하지 못했어요: ${err.message ?? err}`);
  process.exit(1);
}

const body = await res.json().catch(() => ({}));
if (!res.ok || !body.ok) {
  console.error(`\n✗ ingest 실패 (${res.status}): ${body.error ?? res.statusText}`);
  process.exit(1);
}

console.log(`\n✓ ingest 완료 — projectId=${body.projectId}, count=${body.count}`);

async function collectGlobal(out) {
  const home = homedir();
  await collectRootFiles(home, "~", out);
  const dotClaude = join(home, ".claude");
  await collectRootFiles(dotClaude, "~/.claude", out);
  await walkSkills(join(dotClaude, "skills"), "~/.claude/skills", out);
}

async function collectRootFiles(dir, displayPrefix, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if ((e.isFile() || e.isSymbolicLink()) && e.name in ROOT_FILE_KIND) {
      out.push({
        absPath: join(dir, e.name),
        displayPath: `${displayPrefix}/${e.name}`,
        kind: ROOT_FILE_KIND[e.name],
        scope: "global",
      });
    }
  }
}

async function walkSkills(absDir, displayPrefix, out) {
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isFile() && e.name === "SKILL.md") {
      out.push({
        absPath: join(absDir, e.name),
        displayPath: `${displayPrefix}/${e.name}`,
        kind: "SKILL",
        scope: "global",
      });
    } else if (e.isDirectory() && !e.isSymbolicLink() && !SKIP_DIRS.has(e.name)) {
      await walkSkills(join(absDir, e.name), `${displayPrefix}/${e.name}`, out);
    }
  }
}

async function collectProjectRoot(out, root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if ((e.isFile() || e.isSymbolicLink()) && e.name in ROOT_FILE_KIND) {
      out.push({
        absPath: join(root, e.name),
        displayPath: e.name,
        kind: ROOT_FILE_KIND[e.name],
        scope: "project-root",
      });
    }
  }
}

async function collectSubdir(out, root) {
  const counter = { count: 0 };
  await walkSubdir(root, root, 0, counter, out);
}

async function walkSubdir(absDir, root, depth, counter, out) {
  if (depth > MAX_DEPTH || counter.count > MAX_ENTRIES) return;
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    counter.count += 1;
    if (counter.count > MAX_ENTRIES) break;
    if (e.isSymbolicLink()) continue;
    if (e.isFile()) {
      if (depth === 0) continue;
      const kind = NESTED_FILE_KIND[e.name];
      if (!kind) continue;
      const abs = join(absDir, e.name);
      out.push({
        absPath: abs,
        displayPath: relative(root, abs).split(sep).join("/"),
        kind,
        scope: "subdir",
      });
    } else if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walkSubdir(join(absDir, e.name), root, depth + 1, counter, out);
    }
  }
}

async function readClaudeFile(absPath) {
  try {
    const info = await stat(absPath);
    if (!info.isFile()) return null;
    const buf = await readFile(absPath);
    const sliced = buf.length > MAX_BYTES ? buf.subarray(0, MAX_BYTES) : buf;
    return { content: sliced.toString("utf-8"), mtime: info.mtimeMs };
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cwd" || a === "-c") out.cwd = argv[++i];
    else if (a === "--endpoint" || a === "-e") out.endpoint = argv[++i];
  }
  return out;
}
