import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (!globalThis.WebSocket) {
  neonConfig.webSocketConstructor = ws;
}

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrisma(): PrismaClient {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL ?? "",
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

const prisma = global.__prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export { prisma };
