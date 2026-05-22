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

export function emitProjectUpdate(projectId: string): void {
  getListeners().get(projectId)?.forEach((fn) => fn());
}
