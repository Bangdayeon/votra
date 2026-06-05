export const BADGE_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
];

export function buildToolColorMap(slugs: string[]): Map<string, string> {
  const map = new Map<string, string>();
  slugs.forEach((slug, i) => {
    map.set(slug, BADGE_COLORS[i % BADGE_COLORS.length]);
  });
  return map;
}
