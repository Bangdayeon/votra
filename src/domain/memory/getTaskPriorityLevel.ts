export function getTaskPriorityLevel(priority: number): 0 | 1 | 2 | 3 | 4 {
  if (priority <= 0) return 0;
  if (priority === 1) return 1;
  if (priority <= 3) return 2;
  if (priority <= 6) return 3;
  return 4;
}
