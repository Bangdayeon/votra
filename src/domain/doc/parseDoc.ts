import type { DocSection, ParsedDoc } from "@/domain/doc/types";

type DocInput = {
  filePath: string;
  content: string;
  lastModified: Date;
};

/** 마크다운 파일을 heading(#/##/###) 기준으로 섹션 배열로 분리한다. */
export function parseDoc(input: DocInput): ParsedDoc {
  return {
    filePath: input.filePath,
    content: input.content,
    lastModified: input.lastModified,
    sections: splitSections(input.content),
  };
}

function splitSections(content: string): DocSection[] {
  const lines = content.split("\n");
  const sections: DocSection[] = [];
  let currentHeading = "";
  let bodyLines: string[] = [];

  for (const line of lines) {
    const headingMatch = /^(#{1,3}) (.+)$/.exec(line);
    if (headingMatch) {
      const body = bodyLines.join("\n").trim();
      if (currentHeading || body) {
        sections.push({ heading: currentHeading, body });
      }
      currentHeading = headingMatch[2].trim();
      bodyLines = [];
    } else {
      bodyLines.push(line);
    }
  }

  const remainingBody = bodyLines.join("\n").trim();
  if (currentHeading || remainingBody) {
    sections.push({ heading: currentHeading, body: remainingBody });
  }

  return sections;
}
