import { describe, expect, it, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverClaudeFiles } from "@infrastructure/localScan/discoverClaudeFiles";

async function makeTmpDir(): Promise<string> {
  const dir = join(tmpdir(), `votra-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

describe("discoverClaudeFiles", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    for (const d of dirs) {
      await rm(d, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  async function setup(): Promise<string> {
    const cwd = await makeTmpDir();
    dirs.push(cwd);
    return cwd;
  }

  it("CLAUDE.md 를 CLAUDE kind 로 감지한다", async () => {
    const cwd = await setup();
    await writeFile(join(cwd, "CLAUDE.md"), "# rules");

    const files = await discoverClaudeFiles(cwd);

    const found = files.find((f) => f.displayPath === "CLAUDE.md");
    expect(found).toBeDefined();
    expect(found?.kind).toBe("CLAUDE");
    expect(found?.scope).toBe("project-root");
  });

  it("AGENTS.md 를 AGENTS kind 로 감지한다", async () => {
    const cwd = await setup();
    await writeFile(join(cwd, "AGENTS.md"), "# agents");

    const files = await discoverClaudeFiles(cwd);

    const found = files.find((f) => f.displayPath === "AGENTS.md");
    expect(found?.kind).toBe("AGENTS");
    expect(found?.scope).toBe("project-root");
  });

  it(".cursorrules 를 CURSOR kind 로 감지한다", async () => {
    const cwd = await setup();
    await writeFile(join(cwd, ".cursorrules"), "# cursor rules");

    const files = await discoverClaudeFiles(cwd);

    const found = files.find((f) => f.displayPath === ".cursorrules");
    expect(found).toBeDefined();
    expect(found?.kind).toBe("CURSOR");
    expect(found?.scope).toBe("project-root");
  });

  it("GEMINI.md 를 GEMINI kind 로 감지한다", async () => {
    const cwd = await setup();
    await writeFile(join(cwd, "GEMINI.md"), "# gemini rules");

    const files = await discoverClaudeFiles(cwd);

    const found = files.find((f) => f.displayPath === "GEMINI.md");
    expect(found).toBeDefined();
    expect(found?.kind).toBe("GEMINI");
    expect(found?.scope).toBe("project-root");
  });

  it(".cursor/rules/*.mdc 파일을 CURSOR kind subdir 로 감지한다", async () => {
    const cwd = await setup();
    const rulesDir = join(cwd, ".cursor", "rules");
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, "style.mdc"), "# style");
    await writeFile(join(rulesDir, "testing.mdc"), "# testing");

    const files = await discoverClaudeFiles(cwd);

    const mdc = files.filter((f) => f.kind === "CURSOR" && f.scope === "subdir");
    expect(mdc).toHaveLength(2);
    expect(mdc.map((f) => f.displayPath).sort()).toEqual([
      ".cursor/rules/style.mdc",
      ".cursor/rules/testing.mdc",
    ]);
  });

  it(".mdc 가 아닌 파일은 .cursor/rules/ 에 있어도 무시한다", async () => {
    const cwd = await setup();
    const rulesDir = join(cwd, ".cursor", "rules");
    await mkdir(rulesDir, { recursive: true });
    await writeFile(join(rulesDir, "style.mdc"), "# style");
    await writeFile(join(rulesDir, "README.md"), "# readme");

    const files = await discoverClaudeFiles(cwd);

    const cursorFiles = files.filter((f) => f.kind === "CURSOR");
    expect(cursorFiles.every((f) => f.displayPath.endsWith(".mdc"))).toBe(true);
  });

  it("서브디렉토리 GEMINI.md 를 GEMINI kind subdir 로 감지한다", async () => {
    const cwd = await setup();
    const subDir = join(cwd, "packages", "core");
    await mkdir(subDir, { recursive: true });
    await writeFile(join(subDir, "GEMINI.md"), "# sub gemini");

    const files = await discoverClaudeFiles(cwd);

    const found = files.find((f) => f.displayPath === "packages/core/GEMINI.md");
    expect(found).toBeDefined();
    expect(found?.kind).toBe("GEMINI");
    expect(found?.scope).toBe("subdir");
  });

  it("cwd 없이 호출하면 전역 파일만 반환한다", async () => {
    const files = await discoverClaudeFiles();

    expect(files.every((f) => f.scope === "global")).toBe(true);
  });
});
