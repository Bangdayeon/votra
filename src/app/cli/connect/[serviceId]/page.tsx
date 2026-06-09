import { redirect } from "next/navigation";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { isLocalhostCallback } from "@/shared/lib/isLocalhostCallback";
import { ConnectForm } from "./ConnectForm";

const VALID_SERVICES = ["notion", "slack", "github", "linear"] as const;
const SERVICE_LABELS: Record<string, string> = {
  notion: "Notion",
  slack: "Slack",
  github: "GitHub",
  linear: "Linear",
};

export default async function CliConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ projectId?: string; callback?: string; state?: string; projectName?: string }>;
}) {
  const { serviceId } = await params;
  const { projectId, callback, state, projectName } = await searchParams;

  if (!(VALID_SERVICES as readonly string[]).includes(serviceId)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">지원하지 않는 서비스</h1>
        <p className="text-sm text-muted-foreground">
          {serviceId}는 지원하지 않는 서비스예요.
        </p>
      </div>
    );
  }

  if (!projectId || !callback || !state) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">잘못된 요청</h1>
        <p className="text-sm text-muted-foreground">
          projectId / callback / state 값이 없어요. CLI에서 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  if (!isLocalhostCallback(callback)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">콜백 검증 실패</h1>
        <p className="text-sm text-muted-foreground">
          콜백 URL이 localhost가 아니에요. 신뢰할 수 없는 요청이라 거절했어요.
        </p>
      </div>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const params = new URLSearchParams({ projectId, callback, state, ...(projectName ? { projectName } : {}) });
    const next = `/cli/connect/${serviceId}?${params.toString()}`;
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  const label = SERVICE_LABELS[serviceId] ?? serviceId;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">haema에 {label} 연결</h1>
        <p className="text-sm text-muted-foreground">
          {label}을 haema 프로젝트에 연결하면 AI 에이전트가 세션 시작 시 해당 서비스 맥락을 자동으로 가져올 수 있어요.
        </p>
      </div>
      <ConnectForm
        serviceId={serviceId}
        projectId={projectId}
        callback={callback}
        state={state}
        projectName={projectName}
      />
    </div>
  );
}
