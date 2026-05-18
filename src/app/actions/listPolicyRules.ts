"use server";

import { listPolicyRules } from "@/application/listPolicyRules";
import type { PolicyRule } from "@/domain/policy/types";
import { prismaPolicyRuleRepository } from "@/infrastructure/repositories/prismaPolicyRuleRepository";

export async function listPolicyRulesAction(): Promise<PolicyRule[]> {
  return listPolicyRules({ policyRules: prismaPolicyRuleRepository });
}
