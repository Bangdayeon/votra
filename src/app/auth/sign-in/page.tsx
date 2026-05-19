import { Terminal } from "lucide-react";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/SignInForm";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { safeNextPath } from "@/shared/lib/safeNextPath";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);
  const user = await getCurrentUser();
  if (user) redirect(safeNext);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
      <div className="flex w-full max-w-5xl items-center gap-16">
        <div className="hidden flex-1 flex-col gap-6 md:flex">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              votra
            </span>
            <h1 className="text-3xl font-semibold leading-snug text-foreground">
              막힌 곳을 찾고,<br />나아갈 방향을 드려요
            </h1>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            프로젝트 흐름을 분석해 AI를 어떻게 쓸지
            구체적인 솔루션으로 제안해드려요.
          </p>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
            <Terminal className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">CLI와 함께 사용하기</span>
              <span className="text-xs text-muted-foreground">
                터미널에서 <code className="rounded bg-muted px-1 py-0.5 font-mono">votra</code> 명령어로 바로 세션을 시작하고 기록할 수 있어요.
              </span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md shrink-0 rounded-2xl border border-border bg-background p-8 shadow-sm">
          <SignInForm next={safeNext === "/" ? undefined : safeNext} />
        </div>
      </div>
    </div>
  );
}
