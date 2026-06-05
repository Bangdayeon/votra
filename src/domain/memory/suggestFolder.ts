const MODULE_HINTS: Record<string, string[]> = {
  backend:     ["개발", "api", "백엔드", "서버"],
  frontend:    ["개발", "프론트", "ui", "화면"],
  database:    ["개발", "db", "데이터", "마이그레이션"],
  testing:     ["테스트", "test"],
  devops:      ["배포", "deploy", "ci", "인프라"],
  designer:    ["디자인", "ui", "ux"],
  integration: ["연동", "통합", "api"],
  planner:     ["기획", "플래닝", "설계"],
};

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[\s\p{P}]+/u).filter(Boolean);
}

export function suggestFolder(
  task: { title: string; module?: string | null },
  folders: { id: string; name: string }[],
): string | null {
  if (folders.length === 0) return null;

  const titleTokens = tokenize(task.title);
  const moduleHints = task.module ? (MODULE_HINTS[task.module] ?? []) : [];
  const candidateTokens = new Set([...titleTokens, ...moduleHints]);

  let bestId: string | null = null;
  let bestScore = 0;

  for (const folder of folders) {
    const folderTokens = tokenize(folder.name);
    let score = 0;
    for (const ft of folderTokens) {
      if (candidateTokens.has(ft)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = folder.id;
    }
  }

  return bestId;
}
