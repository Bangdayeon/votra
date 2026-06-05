import "server-only";

import { prismaToolRepository } from "@/infrastructure/repositories/prismaToolRepository";

// backward-compat alias
export const prismaCustomSkillRepository = prismaToolRepository;
