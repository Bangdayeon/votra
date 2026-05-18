import "server-only";

import type { PolicyRuleRepository } from "@/application/ports/policyRuleRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaPolicyRuleRepository: PolicyRuleRepository = {
  list: async () => {
    const rows = await prisma.policyRule.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return rows.map((r) => ({
      key: r.key,
      label: r.label,
      description: r.description,
      maxPoints: r.maxPoints,
      displayOrder: r.displayOrder,
    }));
  },
};
