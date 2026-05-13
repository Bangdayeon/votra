/**
 * 기존 Project.cwd 가 null 인 row 들을 backfill 하는 일회성 스크립트.
 *
 * 매칭 규칙
 *  1) ~/.claude/projects/ 폴더를 스캔
 *  2) 각 jsonl 의 첫 cwd 필드 추출 → shortName (basename) 매핑
 *  3) DB 의 Project 중 title === shortName 이면 그 cwd 로 update
 *
 * 실행:  node --env-file=.env scripts/backfill-project-cwd.mjs
 */

import { PrismaClient } from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECTS_ROOT = join(homedir(), ".claude", "projects");

async function extractCwd(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed.cwd === "string") return parsed.cwd;
      } catch {
        /* keep going */
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function buildShortNameToCwd() {
  const cwdByShortName = new Map();
  let entries;
  try {
    entries = await readdir(PROJECTS_ROOT, { withFileTypes: true });
  } catch {
    return cwdByShortName;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(PROJECTS_ROOT, entry.name);
    let files;
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.toLowerCase().endsWith(".jsonl")) continue;
      const cwd = await extractCwd(join(dir, f));
      if (!cwd) continue;
      const shortName = cwd.split("/").filter(Boolean).pop();
      if (!shortName) continue;
      // 같은 shortName 이 여러 폴더에 있으면 첫 발견된 거 유지
      if (!cwdByShortName.has(shortName)) cwdByShortName.set(shortName, cwd);
    }
  }
  return cwdByShortName;
}

const prisma = new PrismaClient();
try {
  const map = await buildShortNameToCwd();
  console.log(`discovered ${map.size} unique cwd entries from ~/.claude/projects/`);

  const projects = await prisma.project.findMany({
    select: { id: true, title: true, cwd: true },
  });

  let updated = 0;
  let skipped = 0;
  const unmatched = [];

  for (const p of projects) {
    if (p.cwd) {
      skipped++;
      continue;
    }
    const cwd = map.get(p.title);
    if (!cwd) {
      unmatched.push(p);
      continue;
    }
    await prisma.project.update({
      where: { id: p.id },
      data: { cwd },
    });
    updated++;
    console.log(`  ✓ ${p.title} → ${cwd}`);
  }

  console.log(`\nresult: updated=${updated}, skipped(이미 cwd 있음)=${skipped}, unmatched=${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log("\nunmatched projects (제목이 .claude/projects 의 폴더와 안 맞음):");
    for (const u of unmatched) console.log(`  - "${u.title}" (id=${u.id})`);
  }
} finally {
  await prisma.$disconnect();
}
