"use client";

import {
  BookOpen,
  Bot,
  Globe2,
  LayoutGrid,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Plug,
  RotateCcw,
  Sun,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { type UserAiPolicyBundle } from "@/app/actions/getUserAiPolicy";
import { resetAccountAction } from "@/app/actions/resetAccount";
import { signOutAction } from "@/app/actions/signOut";
import { updateUserAiPolicyAction } from "@/app/actions/updateUserAiPolicy";
import { updateUserNameAction } from "@/app/actions/updateUserName";
import { AiSpecPolicyFields } from "@/components/aiSpec/AiSpecPolicyFields";
import { useCurrentUser } from "@/components/project/shell/CurrentUserContext";
import { useTheme, type ThemeSetting } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  buildAiSpecPolicyPatch,
  type AiSpecFileChange,
} from "@/domain/aiSpec/types";
import { cn } from "@/lib/utils";

type MenuKey = "account" | "policy" | "guide";

const MENU: { key: MenuKey; label: string; icon: React.ElementType }[] = [
  { key: "account", label: "계정 설정", icon: UserCog },
  { key: "policy", label: "전체 정책", icon: Globe2 },
  { key: "guide", label: "안내", icon: BookOpen },
];

function tabHref(key: MenuKey): string {
  if (key === "account") return "/account";
  return `/account?tab=${key}`;
}

export function AccountSettingsPage({
  initialPolicy,
}: {
  initialPolicy: UserAiPolicyBundle;
}) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const active: MenuKey =
    rawTab === "policy" ? "policy" : rawTab === "guide" ? "guide" : "account";

  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const el = tabRefs.current.get(active);
    if (el && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setIndicator({ left: tabRect.left - navRect.left, width: tabRect.width, ready: true });
    }
  }, [active]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-background px-6 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <h1 className="text-xl font-semibold">전체 설정</h1>
        </div>
        <nav ref={navRef} className="relative flex items-end gap-1">
          {MENU.map(({ key, label, icon: TabIcon }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={tabHref(key)}
                ref={(el) => {
                  if (el) tabRefs.current.set(key, el);
                  else tabRefs.current.delete(key);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-2 text-xs sm:px-3 sm:text-sm transition-colors",
                  isActive
                    ? "font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <TabIcon className="size-3.5 sm:size-4 shrink-0" />
                {label}
              </Link>
            );
          })}
          <div
            className="absolute bottom-0 h-0.5 bg-primary transition-all duration-200 ease-out"
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: indicator.ready ? 1 : 0,
            }}
          />
        </nav>
      </header>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-8 pt-8 pb-12">
        <div className="mx-auto w-full max-w-2xl">
          {active === "account" ? (
            <AccountPane />
          ) : active === "policy" ? (
            <PolicyPane initialPolicy={initialPolicy} />
          ) : (
            <GuidePane />
          )}
        </div>
      </div>
    </div>
  );
}

function AccountPane() {
  const router = useRouter();
  const user = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user.name ?? "");
  const [namePending, startNameUpdate] = useTransition();
  const [signOutPending, startSignOut] = useTransition();
  const [resetPending, startReset] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);

  const trimmedName = name.trim();
  const nameDirty =
    trimmedName.length > 0 && trimmedName !== (user.name ?? "");

  const onSaveName = () => {
    startNameUpdate(async () => {
      const res = await updateUserNameAction(trimmedName);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("유저네임이 변경됐어요.");
      router.refresh();
    });
  };

  const onSignOut = () => {
    startSignOut(async () => {
      await signOutAction();
    });
  };

  const onReset = () => {
    startReset(async () => {
      const res = await resetAccountAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("계정이 초기화됐어요.");
      setConfirmReset(false);
      router.push("/");
    });
  };

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h2 className="text-xl font-semibold">계정 설정</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          아이디·로그아웃·계정 초기화를 관리해요.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-medium">아이디 변경</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            표시 이름(유저네임)을 변경할 수 있어요. 2–32자, 한글·영문·숫자와
            <code className="mx-1">._-</code>를 쓸 수 있어요.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            disabled={namePending}
            placeholder="유저네임"
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              "h-10 flex-1 rounded-md border border-input bg-muted px-3 text-sm",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <Button
            type="button"
            onClick={onSaveName}
            disabled={!nameDirty || namePending}
          >
            {namePending ? "변경 중…" : "변경"}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-medium">화면 테마</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            라이트 모드와 다크 모드 중 선택해요.
          </p>
        </div>
        <div className="flex gap-2">
          {(
            [
              { value: "light", label: "라이트", Icon: Sun },
              { value: "dark", label: "다크", Icon: Moon },
              { value: "system", label: "시스템", Icon: Monitor },
            ] as { value: ThemeSetting; label: string; Icon: React.ElementType }[]
          ).map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              onClick={() => setTheme(value)}
              className={cn(
                theme === value && value === "dark"
                  ? "border-foreground !bg-white !text-black hover:!bg-white hover:!text-black"
                  : theme === value
                    ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
                    : "",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-medium">로그아웃</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            현재 브라우저에서 로그아웃해요.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onSignOut}
          disabled={signOutPending}
          className="w-fit gap-2"
        >
          <LogOut className="size-4" />
          로그아웃
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-medium text-destructive">계정 초기화</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            계정은 유지하되, 등록한 프로젝트와 세션, 정책, 프로필 설정을 모두
            지워요. 되돌릴 수 없어요.
          </p>
        </div>
        {confirmReset ? (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm">정말 모든 프로젝트와 정책을 지울까요?</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmReset(false)}
                disabled={resetPending}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={onReset}
                disabled={resetPending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {resetPending ? "초기화 중…" : "초기화"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmReset(true)}
            className="w-fit gap-2 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <RotateCcw className="size-4" />
            계정 초기화
          </Button>
        )}
      </section>
    </div>
  );
}

function PolicyPane({ initialPolicy }: { initialPolicy: UserAiPolicyBundle }) {
  const [guideline, setGuideline] = useState(initialPolicy.aiSpecGuideline);
  const [initialGuideline, setInitialGuideline] = useState(
    initialPolicy.aiSpecGuideline,
  );
  const [existingFileName, setExistingFileName] = useState<string | null>(
    initialPolicy.aiSpecFileName,
  );
  const [fileChange, setFileChange] = useState<AiSpecFileChange>({
    kind: "none",
  });
  const [pending, startSave] = useTransition();

  const hasChanges =
    guideline !== initialGuideline || fileChange.kind !== "none";

  const onSave = () => {
    startSave(async () => {
      const res = await updateUserAiPolicyAction(
        buildAiSpecPolicyPatch(guideline, fileChange),
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (fileChange.kind === "upload") {
        setExistingFileName(fileChange.name);
      } else if (fileChange.kind === "remove") {
        setExistingFileName(null);
      }
      setFileChange({ kind: "none" });
      setInitialGuideline(guideline);
      toast.success("저장됐어요.");
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-xl font-semibold">전체 정책</h2>
        <span className="mt-2 text-sm text-muted-foreground">
          <p>모든 프로젝트에 공통으로 적용할 AI 활용 정책을 적어주세요.</p>
          <p>ex. 보안·민감 정보 처리 기준 등</p>
        </span>
      </header>

      <div className="relative">
        <AiSpecPolicyFields
          guideline={guideline}
          onGuidelineChange={setGuideline}
          existingFileName={existingFileName}
          fileChange={fileChange}
          onFileChange={setFileChange}
          disabled={pending}
          guidelinePlaceholder="예) 고객 데이터를 포함한 코드를 외부 LLM 으로 보내지 않아요. 보안 관련 변경은 사람이 검토해요."
          fileHint="이미 정리한 정책 문서가 있다면 텍스트 파일로 올려 주세요. (최대 512KB)"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSave}
          disabled={pending || !hasChanges}
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}

const SERVICE_FEATURES: {
  name: string;
  icon: React.ElementType;
  screenshot: string;
  desc: string;
  features: { title: string; lines: string[] }[];
}[] = [
  {
    name: "개요",
    icon: LayoutGrid,
    screenshot: "/assets/images/guide/tab-overview.png",
    desc: "AI 에이전트 세션을 자동 분석해 프로젝트 현황을 요약하고, 지금 해야 할 작업을 추천해줘요.",
    features: [
      {
        title: "💡 AI 요약 & 솔루션",
        lines: [
          "업로드된 AI 에이전트 세션을 분석해 프로젝트 진행 상황·이슈·개선 방향을 한눈에 보여줘요.",
          "새로고침하면 최신 세션 기준으로 다시 분석해요.",
        ],
      },
      {
        title: "💬 추천 다음 작업",
        lines: [
          "AI가 세션 흐름을 보고 높음·보통·낮음 우선순위로 할 일을 정리해줘요.",
          "각 작업마다 에이전트에게 바로 넘길 수 있는 명령어도 함께 제안해요.",
        ],
      },
    ],
  },
  {
    name: "AI 프롬프트 관리",
    icon: Bot,
    screenshot: "/assets/images/guide/tab-manage.png",
    desc: "프로젝트에 업로드된 AI 프롬프트를 정책 기준으로 평가하고, 컨텍스트 흐름을 진단해요.",
    features: [
      {
        title: "AI 프롬프트",
        lines: [
          "CLAUDE.md·AGENTS.md·SKILL.md를 파일 트리로 보여줘요.",
          "파일마다 정책 적합도를 평가하고, 개별 재평가도 할 수 있어요.",
        ],
      },
      {
        title: "🩺 AI 프롬프트 흐름 진단",
        lines: [
          "전체 정책과 프로젝트 정책이 AI 에이전트에 올바르게 전달되는지 진단해요.",
          "문제가 있으면 개선 방법도 함께 알려줘요.",
        ],
      },
    ],
  },
  {
    name: "태스크",
    icon: ListChecks,
    screenshot: "",
    desc: "AI 에이전트가 등록한 태스크를 프로젝트별로 추적하고 관리해요.",
    features: [
      {
        title: "태스크 현황 조회",
        lines: [
          "votra-memory MCP를 통해 에이전트가 등록한 태스크를 PENDING·IN_PROGRESS·DONE 상태로 분류해요.",
          "세션과 연결된 태스크 흐름을 한눈에 파악할 수 있어요.",
        ],
      },
      {
        title: "태스크 이력",
        lines: [
          "완료된 태스크와 핵심 결정 사항을 누적 관리해 프로젝트 맥락을 유지해요.",
        ],
      },
    ],
  },
  {
    name: "팀작업",
    icon: Users,
    screenshot: "",
    desc: "팀원의 AI 에이전트 세션을 함께 확인하고 프로젝트 진행 상황을 공유해요.",
    features: [
      {
        title: "공유 프로젝트",
        lines: [
          "프로젝트를 팀과 공유하면 멤버 모두가 세션·태스크·AI 요약을 볼 수 있어요.",
        ],
      },
      {
        title: "멤버별 활동 현황",
        lines: [
          "누가 어떤 세션을 올렸는지, 진행 중인 태스크가 무엇인지 한눈에 확인해요.",
        ],
      },
    ],
  },
];

const MCP_SETUP_STEPS = [
  {
    step: "1",
    title: "CLI 설치",
    code: "npm install -g @votra/cli",
  },
  {
    step: "2",
    title: "로그인",
    code: "votra signin",
  },
  {
    step: "3",
    title: "MCP 서버 등록",
    code: "votra mcp install",
  },
] as const;

const MCP_TOOLS: { tool: string; desc: string }[] = [
  { tool: "brief", desc: "현재 프로젝트의 태스크·결정·규칙을 한번에 조회 (세션 시작 시 호출)" },
  { tool: "recall", desc: "과거 생각·결정을 의미 유사도로 검색" },
  { tool: "add_task", desc: "새 태스크 등록" },
  { tool: "start_task", desc: "태스크 등록 후 즉시 IN_PROGRESS 시작 (add_task + update_task 합본)" },
  { tool: "finish_task", desc: "태스크를 DONE으로 완료하고 세션 요약 저장 (update_task + log_session 합본)" },
  { tool: "update_task", desc: "태스크 상태·내용 변경 (PENDING / IN_PROGRESS / DONE)" },
  { tool: "list_tasks", desc: "태스크 목록 조회" },
  { tool: "task_detail", desc: "태스크 상세 조회 (description, outcome, keyDecisions 등)" },
  { tool: "log_session", desc: "세션 종료 전 작업 요약 저장" },
  { tool: "load_skill", desc: "상황에 맞는 스킬 지침 로드" },
  { tool: "upload_prompt", desc: "CLAUDE.md·AGENTS.md·SKILL.md 업로드" },
  { tool: "signin", desc: "votra 계정 로그인" },
  { tool: "whoami", desc: "현재 로그인 계정 확인" },
  { tool: "signout", desc: "로그아웃" },
];

function GuidePane() {
  return (
    <div className="flex flex-col gap-12">
      <header>
        <h2 className="text-xl font-semibold">사용 안내</h2>
        <p className="mt-1.5">
          votra는 작업 내용을 task로 자동 저장하여 세션 간 기억상실 문제를 해결합니다.
        </p>
        <p className="mt-1.5">
          또한 최신 커밋 기록과 작업 내용을 기반으로 프로젝트 현황을 요약하고 다음 작업을 추천합니다.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h3 className="text-base font-semibold">서비스 사용 방법</h3>
        <div className="flex flex-col gap-10">
          {SERVICE_FEATURES.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <div key={tab.name} className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TabIcon className="size-4" />
                    <span className="text-sm font-semibold">{tab.name}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{tab.desc}</p>
                </div>
                <div className="aspect-video rounded-lg border border-border bg-muted" />
                <div className="flex flex-col gap-4">
                  {tab.features.map((feat) => (
                    <div key={feat.title}>
                      <p className="text-sm font-semibold">{feat.title}</p>
                      <div className="mt-1 flex flex-col gap-1">
                        {feat.lines.map((line, i) => (
                          <p
                            key={i}
                            className="text-sm leading-relaxed text-muted-foreground"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Plug className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">MCP 서버 연동</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Claude Code에 votra MCP 서버를 연결하면 AI 에이전트가 태스크·메모리를 프로젝트와 직접 연동해 관리해요.
        </p>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-medium">설정 방법</h4>
          <ol className="flex flex-col gap-2">
            {MCP_SETUP_STEPS.map(({ step, title, code }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                  {step}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium">{title}</span>
                  <code className="break-all rounded bg-muted px-3 py-1.5 font-mono text-xs text-foreground">
                    {code}
                  </code>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            install 명령어가 Claude Code 설정에 자동으로 등록해줘요. 완료 후 Claude Code를 재시작하면 돼요.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-medium">사용 가능한 툴</h4>
          <div className="overflow-hidden rounded-lg border border-border">
            {MCP_TOOLS.map(({ tool, desc }, i) => (
              <div
                key={tool}
                className={cn(
                  "flex items-center gap-4 px-4 py-3",
                  i !== 0 && "border-t border-border",
                )}
              >
                <code className="w-32 shrink-0 font-mono text-sm font-semibold text-foreground">
                  {tool}
                </code>
                <span className="text-sm text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
