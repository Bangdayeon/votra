import { Brain, ListChecks, Zap } from "lucide-react";
import { redirect } from "next/navigation";

import { LandingGuide } from "@/components/auth/LandingGuide";
import { SignInForm } from "@/components/auth/SignInForm";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { safeNextPath } from "@/shared/lib/safeNextPath";

const PROBLEMS = [
  "세션이 끊길 때마다 맥락과 이전 결정이 초기화돼요",
  "어떤 작업이 진행 중인지 파악하기 어려워요",
  "태스크가 어디서 멈췄는지 찾는 데 시간이 걸려요",
] as const;

const SOLUTIONS = [
  "세션이 끊겨도 맥락과 이전 결정이 그대로 유지돼요",
  "에이전트가 태스크를 직접 등록하고 관리해요",
  "진행 중인 태스크를 실시간으로 확인해요",
] as const;

const VALUE_PROPS = [
  {
    icon: Brain,
    title: "세션 간 기억 유지",
    desc: "이전 작업 맥락이 끊기지 않아요.",
  },
  {
    icon: ListChecks,
    title: "태스크 단위 관리",
    desc: "AI가 태스크를 등록하고 관리해요.",
  },
  {
    icon: Zap,
    title: "다음 태스크 추천",
    desc: "프로젝트 상태를 기반으로\n다음 작업을 추천해요.",
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

        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="mx-auto flex w-full max-w-md flex-col gap-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-5xl font-bold tracking-tight" style={{ color: "#1EAB84" }}>Haema</h1>
              <span className="w-full border-b border-border pb-6 text-xs text-muted-foreground">태스크 단위로 연결하는 AI 세션 기억</span>
            </div>

            <div className="rounded-2xl bg-background p-8">
              <SignInForm next={safeNext === "/" ? undefined : safeNext} />
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col items-center gap-3 rounded-xl bg-primary/8 p-6 text-center dark:bg-primary/10"
              >
                <Icon className="size-6 text-primary" />
                <span className="text-sm font-medium">{title}</span>
                <span className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Before/After */}
      <section className="px-4 py-24">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-4">
            <span className="text-2xl font-bold">🔴 기존 문제</span>
            <div className="w-full rounded-2xl bg-muted/60 p-12">
              <ul className="flex flex-col gap-5">
                {PROBLEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-base text-foreground/80">
                    <span className="mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <span className="text-2xl font-bold">✅ 해결 내용</span>
            <div className="w-full rounded-2xl bg-primary/8 p-12 dark:bg-primary/10">
              <ul className="flex flex-col gap-5">
                {SOLUTIONS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-base text-foreground/80">
                    <span className="mt-0.5 shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Guide */}
      <LandingGuide />
    </div>
  );
}
