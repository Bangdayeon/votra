import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { subscribeProject } from "@/infrastructure/events/projectEventBus";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const { projectId } = await ctx.params;

  const guard = await assertProjectMember(projectId);
  if (!guard.ok) {
    return new Response(guard.error, { status: 401 });
  }

  const enc = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let keepalive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          // client already disconnected
        }
      };

      unsubscribe = subscribeProject(projectId, () => {
        send("event: update\ndata: {}\n\n");
      });

      keepalive = setInterval(() => send(": keepalive\n\n"), 25_000);
    },
    cancel() {
      unsubscribe?.();
      if (keepalive !== undefined) clearInterval(keepalive);
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
