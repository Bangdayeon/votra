import { describe, expect, it, vi } from "vitest";

import type { ToolRepository } from "@/application/ports/toolRepository";
import { createTool } from "@/application/createTool";
import type { ProjectToolRecord } from "@/domain/memory/types";

function makeTool(overrides?: Partial<ProjectToolRecord>): ProjectToolRecord {
  return {
    id: "tool-1",
    slug: "custom-tool",
    name: "커스텀 툴",
    description: "설명",
    folder: "기타",
    content: "## 툴 내용",
    patternSummary: null,
    contextHint: null,
    hookEvent: null,
    hookMatcher: null,
    hookScript: null,
    isEnabled: true,
    projectId: "proj-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const BASE_INPUT = { projectId: "proj-1", name: "커스텀 툴", description: "설명", folder: "기타", content: "## 내용" };

describe("createTool", () => {
  it("빈 이름이면 err를 반환한다", async () => {
    const tools = { create: vi.fn() } as unknown as ToolRepository;
    const result = await createTool({ ...BASE_INPUT, name: "" }, { tools });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("툴 이름이 필요해요.");
    expect(tools.create).not.toHaveBeenCalled();
  });

  it("공백만인 이름이면 err를 반환한다", async () => {
    const tools = { create: vi.fn() } as unknown as ToolRepository;
    const result = await createTool({ ...BASE_INPUT, name: "   " }, { tools });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("툴 이름이 필요해요.");
  });

  it("빈 content이면 err를 반환한다", async () => {
    const tools = { create: vi.fn() } as unknown as ToolRepository;
    const result = await createTool({ ...BASE_INPUT, content: "" }, { tools });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("툴 내용이 필요해요.");
    expect(tools.create).not.toHaveBeenCalled();
  });

  it("공백만인 content이면 err를 반환한다", async () => {
    const tools = { create: vi.fn() } as unknown as ToolRepository;
    const result = await createTool({ ...BASE_INPUT, content: "\n  \t" }, { tools });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("툴 내용이 필요해요.");
  });

  it("유효한 입력으로 툴을 생성한다", async () => {
    const created = makeTool();
    const tools = { create: vi.fn().mockResolvedValue(created) } as unknown as ToolRepository;

    const result = await createTool(BASE_INPUT, { tools });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(created);
    expect(tools.create).toHaveBeenCalledWith(BASE_INPUT);
  });

  it("DB 오류가 발생하면 err를 반환한다", async () => {
    const tools = {
      create: vi.fn().mockRejectedValue(new Error("중복 슬러그")),
    } as unknown as ToolRepository;

    const result = await createTool(BASE_INPUT, { tools });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("중복 슬러그");
  });
});
