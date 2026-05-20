import { describe, expect, it } from "vitest";
import { parseDoc } from "@domain/doc/parseDoc";

describe("parseDoc", () => {
  it("마크다운을 heading 기준으로 섹션 배열로 분리한다", () => {
    const content = `도입부 텍스트입니다.

# 원칙

간결하고 명확하게 작성한다.

## 세부 규칙

- 규칙 1
- 규칙 2

### 예외 사항

특별한 경우에만 허용한다.`;

    const result = parseDoc({
      filePath: "CLAUDE.md",
      content,
      lastModified: new Date("2025-01-01"),
    });

    expect(result.filePath).toBe("CLAUDE.md");
    expect(result.sections).toHaveLength(4);

    expect(result.sections[0].heading).toBe("");
    expect(result.sections[0].body).toContain("도입부 텍스트");

    expect(result.sections[1].heading).toBe("원칙");
    expect(result.sections[1].body).toContain("간결하고 명확하게");

    expect(result.sections[2].heading).toBe("세부 규칙");
    expect(result.sections[2].body).toContain("규칙 1");

    expect(result.sections[3].heading).toBe("예외 사항");
    expect(result.sections[3].body).toContain("특별한 경우");
  });
});
