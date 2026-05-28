import type { SkillRecord } from "@/domain/memory/types";

export type SkillRepository = {
  listWithConfig: (projectId: string) => Promise<SkillRecord[]>;
  setEnabled: (projectId: string, slug: string, enabled: boolean) => Promise<void>;
};
