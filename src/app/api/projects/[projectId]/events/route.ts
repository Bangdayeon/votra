import { prisma } from "@/infrastructure/db/prisma";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { subscribeProject } from "@/infrastructure/events/projectEventBus";

type RouteContext = { params: Promise<{ projectId: string }> };

const POLL_INTERVAL_MS = 4_000;

export async function GET(_req: Request, ctx: RouteContext) {
  const { projectId } = await ctx.params;

  const guard = await assertProjectMember(projectId);
  if (!guard.ok) {
    return new Response(guard.error, { status: 401 });
  }

  const enc = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let keepalive: ReturnType<typeof setInterval> | undefined;
  let pollInterval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let lastEventMs = 0;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const fireUpdate = () => {
        lastEventMs = Date.now();
        send("event: update\ndata: {}\n\n");
      };

      // Fast path: same-instance event bus
      unsubscribe = subscribeProject(projectId, fireUpdate);

      keepalive = setInterval(() => send(": keepalive\n\n"), 25_000);

      // Cross-instance fallback: poll activityAt every 4s
      let lastActivityAt: Date | null = null;
      pollInterval = setInterval(async () => {
        try {
          const row = await prisma.project.findUnique({
            where: { id: projectId },
            select: { activityAt: true },
          });
          if (!row) return;
          if (lastActivityAt === null) {
            lastActivityAt = row.activityAt;
            return;
          }
          if (row.activityAt > lastActivityAt) {
            lastActivityAt = row.activityAt;
            // deduplicate: skip if the in-memory path already fired recently
            if (Date.now() - lastEventMs > POLL_INTERVAL_MS / 2) {
              fireUpdate();
            }
          }
        } catch {
          // DB unavailable — don't close the stream, next poll will retry
        }
      }, POLL_INTERVAL_MS);
    },
    cancel() {
      unsubscribe?.();
      if (keepalive !== undefined) clearInterval(keepalive);
      if (pollInterval !== undefined) clearInterval(pollInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
