"use server";

import { redirect } from "next/navigation";

import { setSessionCookie } from "@/infrastructure/auth/setSessionCookie";
import { prisma } from "@/infrastructure/db/prisma";
import { safeNextPath } from "@/shared/lib/safeNextPath";

export async function mockSignInAction(next?: string): Promise<void> {
  if (process.env.MOCK_AUTH !== "true") {
    throw new Error("Mock auth disabled");
  }

  const user = await prisma.user.upsert({
    where: { email: "dev@mock.local" },
    update: {},
    create: { email: "dev@mock.local", name: "Dev" },
  });

  await setSessionCookie(user.id);
  redirect(safeNextPath(next));
}
