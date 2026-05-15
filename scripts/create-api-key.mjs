/**
 * Votra API 키 발급 스크립트. 평문 키는 stdout 에 1회만 출력돼요.
 *
 * 사용:
 *   node --env-file=.env scripts/create-api-key.mjs --user <userId> --name <label>
 *
 * 예:
 *   node --env-file=.env scripts/create-api-key.mjs --user clxxxx --name "bibi local CLI"
 */

import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";

const args = parseArgs(process.argv.slice(2));
if (!args.user || !args.name) {
  console.error("필수 인자가 빠졌어요: --user <userId> --name <label>");
  process.exit(2);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { id: args.user },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`해당 user 가 없어요: ${args.user}`);
    process.exit(1);
  }

  const plaintext = `vt_${randomBytes(32).toString("hex")}`;
  const hashedSecret = createHash("sha256").update(plaintext).digest("hex");

  const created = await prisma.apiKey.create({
    data: { name: args.name, hashedSecret, userId: user.id },
    select: { id: true, name: true, createdAt: true },
  });

  console.log("");
  console.log(`✓ API 키 발급 완료 (${created.name})`);
  console.log(`  user:  ${user.email} (${user.id})`);
  console.log(`  keyId: ${created.id}`);
  console.log("");
  console.log("아래 평문 키는 지금 한 번만 보여요. 안전한 곳에 저장하세요:");
  console.log("");
  console.log(`  ${plaintext}`);
  console.log("");
  console.log("CLI 사용 예시:");
  console.log("  export VOTRA_API_KEY=" + plaintext);
  console.log("  votra upload --watch");
} finally {
  await prisma.$disconnect();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--user" || a === "-u") out.user = argv[++i];
    else if (a === "--name" || a === "-n") out.name = argv[++i];
  }
  return out;
}
