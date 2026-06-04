type ScoreInput = {
  accessCount: number;
  priority: number;
  isPinned: boolean;
  lastAccessedAt: Date | null;
  createdAt: Date;
};

export function computeImportanceScore(task: ScoreInput, now: Date = new Date()): number {
  const pinBonus = task.isPinned ? 30 : 0;
  const accessScore = Math.min(task.accessCount * 10, 30);
  const priorityScore = Math.round((task.priority / 10) * 25);

  const referenceDate = task.lastAccessedAt ?? task.createdAt;
  const ageDays = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 15 - Math.floor(ageDays / 7));

  return Math.min(pinBonus + accessScore + priorityScore + recencyScore, 100);
}
