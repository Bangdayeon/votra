import type { MemoryDecaySettings } from "@/domain/memory/memoryTierTypes";
import type { MemoryTierValue } from "@/domain/memory/types";

type DecayInput = {
  isPinned: boolean;
  accessCount: number;
  priority: number;
  lastAccessedAt: Date | null;
  doneAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export function computeMemoryTier(
  task: DecayInput,
  settings: MemoryDecaySettings,
  now: Date = new Date(),
): MemoryTierValue {
  if (task.deletedAt !== null) return "TRASH";
  if (task.isPinned) return "LONG_TERM";

  const isLongTerm =
    task.accessCount >= settings.longTermMinAccessCount &&
    task.priority >= settings.longTermMinPriority;
  if (isLongTerm) return "LONG_TERM";

  const referenceDate = task.lastAccessedAt ?? task.doneAt ?? task.createdAt;
  const ageDays = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);

  const trashThreshold = settings.activeToArchivedDays + settings.archivedToTrashDays;
  if (ageDays >= trashThreshold) return "TRASH";
  if (ageDays >= settings.activeToArchivedDays) return "ARCHIVED";
  return "ACTIVE";
}
