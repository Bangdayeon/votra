import type { PolicyRule } from "@/domain/policy/types";

export type PolicyRuleRepository = {
  list: () => Promise<PolicyRule[]>;
};
