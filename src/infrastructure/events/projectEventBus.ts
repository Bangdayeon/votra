type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribeProject(projectId: string, fn: Listener): () => void {
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
  listeners.get(projectId)?.forEach((fn) => fn());
}
