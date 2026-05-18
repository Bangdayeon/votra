import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
import type { PolicyRule } from "@/domain/policy/types";

export function listPolicyRules(deps: {
  policyRules: PolicyRuleRepository;
}): Promise<PolicyRule[]> {
  return deps.policyRules.list();
}
