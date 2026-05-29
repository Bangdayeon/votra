import type { SkillRecord } from "@/domain/memory/types";

const STOP_WORDS = new Set([
  "and", "or", "the", "for", "use", "with", "when", "before",
  "after", "this", "that", "your", "from", "into", "over",
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,./\-_()+]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export function matchSkillsToTask(
  task: { title: string; module?: string | null },
  skills: SkillRecord[],
): SkillRecord[] {
  const taskWords = keywords(task.title + " " + (task.module ?? ""));
  if (taskWords.length === 0) return [];

  return skills.filter((skill) => {
    const skillWords = keywords(`${skill.slug} ${skill.name} ${skill.contextHint}`);
    return taskWords.some((tw) => skillWords.includes(tw));
  });
}
