"use client";

import {
  BookOpen,
  Bot,
  LayoutGrid,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Plug,
  RotateCcw,
  Sparkles,
  Sun,
  Terminal,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { resetAccountAction } from "@/app/actions/resetAccount";
import { signOutAction } from "@/app/actions/signOut";
import { updateUserNameAction } from "@/app/actions/updateUserName";
import { CommandsTab } from "@/components/memory/CommandsTab";
import { ToolsTab } from "@/components/memory/ToolsTab";
import { useCurrentUser } from "@/components/project/shell/CurrentUserContext";
import { useTheme, type ThemeSetting } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

type MenuKey = "account" | "guide" | "tools" | "commands";

const MENU: { key: MenuKey; label: string; icon: React.ElementType }[] = [
  { key: "account", label: "계정 설정", icon: UserCog },
  { key: "guide", label: "안내", icon: BookOpen },
  { key: "tools", label: "툴", icon: Sparkles },
  { key: "commands", label: "커맨드", icon: Terminal },
];

function tabHref(key: MenuKey): string {
  if (key === "account") return "/account";
  return `/account?tab=${key}`;
}

export function AccountSettingsPage() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const active: MenuKey =
    rawTab === "guide" ? "guide"
    : rawTab === "tools" ? "tools"
    : rawTab === "commands" ? "commands"
    : "account";

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
          {active === "account" && <AccountPane />}
          {active === "guide" && <GuidePane />}
          {active === "tools" && <ToolsTab />}
          {active === "commands" && <CommandsTab />}
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
    desc: "최근 작업 내용을 바탕으로 프로젝트 현황을 요약하고, 다음 작업을 추천해줘요.",
    features: [
      {
        title: "💡 AI 요약 & 솔루션",
        lines: [
          "최근 커밋 기록과 저장된 작업 내용을 분석해 프로젝트 진행 상황, 이슈를 한눈에 보여줘요.",
          "특이하거나 반복적인 문제 패턴이 있으면 경고와 함께 간단한 솔루션을 제시해요."
        ],
      },
      {
        title: "💬 제안 작업",
        lines: [
          "커밋 기록과 작업 내용 기반으로 다음에 진행하면 좋은 작업을 추천해줘요.",
          "에이전트에게 바로 넘길 수 있는 명령어를 함께 제안해요.",
        ],
      },
    ],
  },
  {
    name: "태스크",
    icon: ListChecks,
    screenshot: "/assets/images/guide/tab-task.png",
    desc: "AI 에이전트가 등록한 태스크를 한눈에 확인하고 관리할 수 있어요.",
    features: [
      {
        title: "태스크 현황 조회",
        lines: [
          "haema-memory MCP를 통해 에이전트가 등록한 태스크를 관리해요.",
          "폴더별로 분리하여 태스크 흐름을 한눈에 파악할 수 있어요.",
        ],
      },
      {
        title: "태스크 이력",
        lines: [
          "완료된 태스크와 핵심 결정 사항을 보관하여 프로젝트 맥락 유지에 활용해요.",
        ],
      },
    ],
  },
  
  {
    name: "팀작업",
    icon: Users,
    screenshot: "/assets/images/guide/tab-team.png",
    desc: "팀원을 추가하여 함께 확인하고 태스크 상황을 공유해요.",
    features: [
      {
        title: "공유 프로젝트",
        lines: [
          "프로젝트를 팀과 공유하면 멤버 모두가 태스크 상태를 공유할 수 있어요.",
        ],
      },
    ],
  },
];

const CLI_STEPS = [
  { step: "1", title: "CLI 설치", code: "npm install -g @haema/cli" },
  { step: "2", title: "MCP 서버 등록", code: "haema install" },
] as const;

const CLI_COMMANDS = [
  {
    cmd: "haema install",
    desc: "AI 도구에 Haema MCP 서버 자동 등록",
    usage: "haema install [claude|cursor|gemini|codex|all]",
  },
] as const;

const MCP_SETUP_STEPS = [
  {
    step: "1",
    title: "CLI 설치",
    code: "npm install -g @haema/cli",
  },
  {
    step: "2",
    title: "MCP 서버 등록",
    code: "haema install",
  },
  {
    step: "3",
    title: "로그인",
    code: "Claude Code 재시작 후 signin 툴로 Haema 계정에 로그인해요",
  },
] as const;

const MCP_TOOLS: { tool: string; desc: string }[] = [
  { tool: "brief", desc: "세션 시작 브리핑 — 태스크·결정·추천 작업 한번에 조회" },
  { tool: "recall", desc: "과거 결정·인사이트를 의미 기반으로 검색" },
  { tool: "add_task", desc: "새 태스크 등록" },
  { tool: "start_task", desc: "태스크 등록 후 즉시 IN_PROGRESS로 시작" },
  { tool: "update_task", desc: "태스크 상태·내용 변경 (PENDING / IN_PROGRESS / DONE)" },
  { tool: "finish_task", desc: "태스크 완료 처리 — 요약·핵심 결정 함께 저장" },
  { tool: "list_tasks", desc: "태스크 목록 조회 (상태·모듈 필터 가능)" },
  { tool: "task_detail", desc: "태스크 상세 정보 조회" },
  { tool: "log_session", desc: "세션 종료 전 작업 요약 저장" },
  { tool: "upload_prompt", desc: "CLAUDE.md·AGENTS.md·SKILL.md 업로드" },
  { tool: "load_skill", desc: "컨텍스트별 커맨드 지침 로드" },
  { tool: "signin", desc: "브라우저 OAuth로 Haema 계정 로그인" },
  { tool: "whoami", desc: "현재 로그인 계정 확인" },
  { tool: "signout", desc: "로그아웃 및 인증 정보 삭제" },
];

function GuidePane() {
  return (
    <div className="flex flex-col gap-12">
      <header>
        <h2 className="text-xl font-semibold">사용 안내</h2>
        <p className="mt-1.5">
          Haema는 작업 내용을 자동 저장하여 세션 간 기억상실 문제를 해결합니다.
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
                <Image src={tab.screenshot} alt={`${tab.name} 스크린샷`} width={800} height={400} className="rounded-lg border border-border object-cover" />
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

      <div className="bg-gray-400 rounded-md h-[0.2px]"/>
      <section className="flex flex-col gap-4">
        <h3 className="text-base font-semibold">CLI 연동 방법</h3>
        <p className="text-sm text-muted-foreground">
          Haema CLI를 설치하고 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">haema install</code> 명령어로 MCP 서버를 AI 도구에 등록해요.
        </p>
        <ol className="flex flex-col gap-2">
          {CLI_STEPS.map(({ step, title, code }) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                {step}
              </span>
              <span className="w-28 shrink-0 text-sm font-medium">{title}</span>
              <code className="flex-1 rounded bg-muted px-3 py-1.5 font-mono text-sm text-foreground">
                {code}
              </code>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          등록 후 Claude Code를 재시작하면 haema-memory MCP 서버가 활성화돼요. 이후 signin 툴로 Haema 계정에 로그인하세요.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">CLI 명령어 모음</h3>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          {CLI_COMMANDS.map(({ cmd, desc, usage }, i) => (
            <div
              key={cmd}
              className={cn(
                "flex flex-col gap-1.5 px-4 py-3.5",
                i !== 0 && "border-t border-border",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <code className="font-mono text-sm font-semibold text-foreground">
                  {cmd}
                </code>
                <span className="text-right text-sm text-muted-foreground">
                  {desc}
                </span>
              </div>
              <code className="font-mono text-xs text-muted-foreground/70">
                {usage}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Plug className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">MCP 서버 연동</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Haema MCP 서버가 연결되면 AI 에이전트가 태스크·메모리를 프로젝트와 직접 연동해 관리해요. Claude Code, Cursor, Gemini CLI, Codex를 지원해요.
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
            <code className="font-mono">haema install all</code>을 실행하면 Claude Code, Cursor, Gemini CLI, Codex 모두에 등록해요. 완료 후 AI 도구를 재시작하면 돼요.
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
