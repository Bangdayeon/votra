import { redirect } from "next/navigation";

import { CliApproveForm } from "@/components/auth/CliApproveForm";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { isLocalhostCallback } from "@/shared/lib/isLocalhostCallback";

export default async function CliSigninPage({
  searchParams,
}: {
  searchParams: Promise<{ callback?: string; state?: string }>;
}) {
  const { callback, state } = await searchParams;

  if (!callback || !state) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">잘못된 요청</h1>
        <p className="text-sm text-muted-foreground">
          callback / state 값이 없어요. CLI 에서 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  if (!isLocalhostCallback(callback)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">콜백 검증 실패</h1>
        <p className="text-sm text-muted-foreground">
          콜백 URL 이 localhost 가 아니에요. 신뢰할 수 없는 요청이라 거절했어요.
        </p>
      </div>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const params = new URLSearchParams({ callback, state });
    const next = `/cli/signin?${params.toString()}`;
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Haema CLI 연결</h1>
        <p className="text-sm text-muted-foreground">
          이 계정으로 CLI 에 사용할 API 키를 발급해요. 허용하면 키가 콜백
          URL 로 전달돼요.
        </p>
      </div>
      <CliApproveForm callback={callback} state={state} email={user.email} />
    </div>
  );
}
