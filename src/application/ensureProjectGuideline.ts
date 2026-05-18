import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
import type { ProjectRepository } from "@/application/ports/projectRepository";
import { buildDefaultGuideline } from "@/domain/policy/buildDefaultGuideline";

/** aiSpecGuideline 이 비어 있으면 PolicyRule 기본값으로 채워 DB 에 저장하고 그 값을 반환.
 *  내용이 이미 있으면 그대로 반환. 한 번 채워지면 사용자가 자유롭게 편집 가능.
 */
export async function ensureProjectGuideline(
  projectId: string,
  current: string | null,
  deps: {
    projects: ProjectRepository;
    policyRules: PolicyRuleRepository;
  },
): Promise<string> {
  if (current && current.trim().length > 0) return current;
  const rules = await deps.policyRules.list();
  const guideline = buildDefaultGuideline(rules);
  await deps.projects.update({ id: projectId, aiSpecGuideline: guideline });
  return guideline;
}
