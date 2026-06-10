import "server-only";

import { prisma } from "@/infrastructure/db/prisma";

type Listener = () => void;

declare global {
  var __projectListeners: Map<string, Set<Listener>> | undefined;
}

function getListeners(): Map<string, Set<Listener>> {
  if (!global.__projectListeners) {
    global.__projectListeners = new Map();
  }
  return global.__projectListeners;
}

export function subscribeProject(projectId: string, fn: Listener): () => void {
  const listeners = getListeners();
  if (!listeners.has(projectId)) listeners.set(projectId, new Set());
  listeners.get(projectId)!.add(fn);
  return () => {
    const set = listeners.get(projectId);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) listeners.delete(projectId);
  };
}

// Fires in-memory listeners (same-instance fast path) and touches activityAt
// in the DB so SSE pollers on other instances detect the change within ~4s.
export function emitProjectUpdate(projectId: string): void {
  getListeners().get(projectId)?.forEach((fn) => fn());
  prisma.project
    .update({ where: { id: projectId }, data: { activityAt: new Date() } })
    .catch(() => {});
}
