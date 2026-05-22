"use client";

import { useEffect, useRef } from "react";

export function useProjectEvents(projectId: string, onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!projectId) return;
    const es = new EventSource(`/api/projects/${projectId}/events`);
    es.addEventListener("update", () => onUpdateRef.current());
    return () => es.close();
  }, [projectId]);
}
