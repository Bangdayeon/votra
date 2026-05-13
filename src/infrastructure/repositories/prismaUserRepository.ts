import "server-only";

import type { UserRepository } from "@/application/ports/userRepository";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaUserRepository: UserRepository = {
  findByEmail: (email) =>
    prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    }),

  create: (data) =>
    prisma.user.create({
      data: { email: data.email, name: data.name ?? undefined },
      select: { id: true, email: true, name: true },
    }),
};
