"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { getProjectBranchNodesAction } from "@/app/actions/getProjectBranchNodes";
import type { BranchNode } from "@/application/getProjectBranchNodes";
import { BranchGraph } from "@/components/BranchGraph";
import { Card } from "@/components/Card";
import type { Project } from "@/components/ProjectsContext";

export function BranchTab({ selected }: { selected: Project }) {
  const [nodes, setNodes] = useState<BranchNode[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProjectBranchNodesAction(selected.id)
      .then((n) => {
        if (!cancelled) setNodes(n);
      })
      .catch(() => {
        if (!cancelled) setNodes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id]);

  return (
    <Card>
      <p className="text-sm text-muted-foreground">
        {selected.name}의 세션 흐름
      </p>
      <div className="py-3">
        {loading ? (
          <div className="flex h-16 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : nodes && nodes.length > 0 ? (
          <BranchGraph nodes={nodes} cwd={selected.cwd} />
        ) : (
          <p className="text-sm text-muted-foreground">아직 세션이 없어요.</p>
        )}
      </div>
    </Card>
  );
}
