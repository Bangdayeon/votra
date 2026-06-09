"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  connectIntegrationAction,
  type ConnectIntegrationState,
} from "@/app/actions/connectIntegrationAction";
import { Button } from "@/components/ui/button";

const SERVICE_LABELS: Record<string, string> = {
  notion: "Notion",
  slack: "Slack",
  github: "GitHub",
  linear: "Linear",
};

const INITIAL: ConnectIntegrationState = {};

export function ConnectForm({
  serviceId,
  projectId,
  callback,
  state,
  projectName,
}: {
  serviceId: string;
  projectId: string;
  callback: string;
  state: string;
  projectName?: string;
}) {
  const router = useRouter();
  const [actionState, action, pending] = useActionState(connectIntegrationAction, INITIAL);
  const label = SERVICE_LABELS[serviceId] ?? serviceId;

  useEffect(() => {
    if (actionState.error === undefined && !pending && actionState !== INITIAL) {
      const url = new URL(callback);
      url.searchParams.set("success", "true");
      url.searchParams.set("state", state);
      router.push(url.toString());
    }
  }, [actionState, pending, callback, state, router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm flex flex-col gap-1">
        <p>
          <span className="text-muted-foreground">서비스</span>{" "}
          <span className="font-medium">{label}</span>
        </p>
        {projectName && (
          <p>
            <span className="text-muted-foreground">프로젝트</span>{" "}
            <span className="font-medium">{projectName}</span>
          </p>
        )}
        <p className="break-all">
          <span className="text-muted-foreground">콜백</span>{" "}
          <span className="font-mono text-xs">{callback}</span>
        </p>
      </div>
      {actionState.error && (
        <p className="text-sm text-destructive">{actionState.error}</p>
      )}
      <form action={action}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="source" value={serviceId} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "연결 중…" : `${label} 연결하기`}
        </Button>
      </form>
    </div>
  );
}
