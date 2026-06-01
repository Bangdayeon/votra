import { Brain, ListChecks, Terminal, Zap } from "lucide-react";
import { redirect } from "next/navigation";

import { LandingGuide } from "@/components/auth/LandingGuide";
import { SignInForm } from "@/components/auth/SignInForm";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { safeNextPath } from "@/shared/lib/safeNextPath";

const STATS = [
  {
    value: "최대 50%",
    label: "토큰 절감",
    sub: "세션마다 컨텍스트 재설명 없이 바로 시작",
  },
  {
    value: "80%",
    label: "빠른 세션 복귀",
    sub: "brief 한 번으로 프로젝트 현황 즉시 파악",
  },
  {
    value: "0건",
    label: "태스크 누락",
    sub: "에이전트가 등록한 작업을 빠짐없이 추적",
  },
] as const;

const VALUE_PROPS = [
  {
    icon: Brain,
    title: "세션 간 기억 유지",
    desc: "이전 작업·결정·맥락이 끊기지 않아요.",
  },
  {
    icon: ListChecks,
    title: "태스크 자동 추적",
    desc: "에이전트가 등록한 태스크를 실시간으로 확인해요.",
  },
  {
    icon: Zap,
    title: "AI 작업 추천",
    desc: "커밋 기록 기반으로 다음 작업을 제안해요.",
  },
] as const;

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
    <div>
      {/* Section 1: Login */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
        </div>

        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-5xl font-bold tracking-tight" style={{ color: "#7B1FA2" }}>votra</h1>
            <span className="w-full border-b border-border pb-6 text-xs text-muted-foreground">태스크 단위로 연결하는 AI 세션 기억</span>
          </div>

          <div className="rounded-2xl bg-background p-8">
            <SignInForm next={safeNext === "/" ? undefined : safeNext} />
          </div>
        </div>
      </section>

      {/* Section 2: Hero */}
      <section className="border-t border-border px-4 py-24">
        <div className="flex w-full max-w-4xl mx-auto flex-col items-center gap-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              AI 에이전트,<br />이제 기억합니다
            </h2>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              votra가 기억을 유지하고 다음 작업을 추천해요.
            </p>
          </div>

          {/* Stats strip */}
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background/70 backdrop-blur-sm">
            <div className="grid grid-cols-3 divide-x divide-border">
              {STATS.map(({ value, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-1 px-4 py-5 text-center sm:px-6">
                  <span className="text-2xl font-bold text-primary sm:text-3xl">{value}</span>
                  <span className="text-xs font-semibold text-foreground sm:text-sm">{label}</span>
                  <span className="hidden text-xs leading-tight text-muted-foreground sm:block">{sub}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-4 py-2 text-center">
              <span className="text-xs text-muted-foreground">votra 실사용 데이터 기준</span>
            </div>
          </div>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-4 text-left backdrop-blur-sm"
              >
                <Icon className="size-4 text-primary" />
                <span className="text-sm font-medium">{title}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-muted/50 text-left text-xs font-mono shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-2">
              <span className="size-2.5 rounded-full bg-destructive/50" />
              <span className="size-2.5 rounded-full bg-yellow-500/50" />
              <span className="size-2.5 rounded-full bg-green-500/50" />
              <Terminal className="ml-auto size-3 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1.5 p-3.5 text-foreground/80">
              <p>
                <span className="text-green-600 dark:text-green-400">$</span> votra install
              </p>
              <p className="pl-2 text-muted-foreground">✓ MCP 서버 등록됨 (Claude Code)</p>
              <p className="mt-1">
                <span className="text-blue-500">[Claude]</span> brief
              </p>
              <p className="pl-2 text-muted-foreground">→ 진행 중 태스크: 3개</p>
              <p className="pl-2 text-muted-foreground">→ 추천: API 응답 캐싱 추가</p>
              <p className="mt-1">
                <span className="text-blue-500">[Claude]</span> add_task &quot;API 캐싱&quot;
              </p>
              <p className="pl-2 text-muted-foreground">
                ✓ #15 등록됨 <span className="animate-pulse">▋</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Guide */}
      <LandingGuide />
    </div>
  );
}
