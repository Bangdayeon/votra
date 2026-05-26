"use client";

import {
  BookOpen,
  Bot,
  Clock,
  Globe2,
  LayoutGrid,
  Loader2,
  LogOut,
  RotateCcw,
  Terminal,
  UserCog,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { getUserAiPolicyAction } from "@/app/actions/getUserAiPolicy";
import { resetAccountAction } from "@/app/actions/resetAccount";
import { signOutAction } from "@/app/actions/signOut";
import { updateUserAiPolicyAction } from "@/app/actions/updateUserAiPolicy";
import { updateUserNameAction } from "@/app/actions/updateUserName";
import { AiSpecPolicyFields } from "@/components/aiSpec/AiSpecPolicyFields";
import { useCurrentUser } from "@/components/project/shell/CurrentUserContext";
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

export function AccountSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const active: MenuKey =
    rawTab === "policy" ? "policy" : rawTab === "guide" ? "guide" : "account";

  const setActive = (key: MenuKey) => {
    router.replace(`/account?tab=${key}`);
  };

  return (
    <div className="flex h-full min-h-0">
      <nav className="flex w-[220px] shrink-0 flex-col gap-1 border-r border-border bg-[#F7F6F3] p-3">
        <h2 className="px-2 pb-2 text-sm font-medium text-muted-foreground">
          설정
        </h2>
        {MENU.map((m) => {
          const Icon = m.icon;
          const selected = m.key === active;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setActive(m.key)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                selected
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-[#EBE9E4]",
              )}
            >
              <Icon className="size-4" />
              {m.label}
            </button>
          );
        })}
      </nav>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-8 pt-8 pb-12">
        <div className="mx-auto w-full max-w-2xl">
          {active === "account" ? (
            <AccountPane />
          ) : active === "policy" ? (
            <PolicyPane />
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
              "h-10 flex-1 rounded-md border border-[#E4E2DD] bg-white px-3 text-sm",
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

function PolicyPane() {
  const [loading, setLoading] = useState(true);
  const [guideline, setGuideline] = useState("");
  const [initialGuideline, setInitialGuideline] = useState("");
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [fileChange, setFileChange] = useState<AiSpecFileChange>({
    kind: "none",
  });
  const [pending, startSave] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserAiPolicyAction()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setGuideline(res.policy.aiSpecGuideline);
          setInitialGuideline(res.policy.aiSpecGuideline);
          setExistingFileName(res.policy.aiSpecFileName);
          setFileChange({ kind: "none" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          disabled={loading || pending}
          guidelinePlaceholder="예) 고객 데이터를 포함한 코드를 외부 LLM 으로 보내지 않아요. 보안 관련 변경은 사람이 검토해요."
          fileHint="이미 정리한 정책 문서가 있다면 텍스트 파일로 올려 주세요. (최대 512KB)"
        />
        {loading && (
          <div
            role="status"
            aria-live="polite"
            aria-label="전체 정책 불러오는 중"
            className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-foreground/10 backdrop-blur-[1px]"
          >
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onSave}
          disabled={loading || pending || !hasChanges}
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
    name: "AI 작업 관리",
    icon: Bot,
    screenshot: "/assets/images/guide/tab-manage.png",
    desc: "프로젝트에 업로드된 AI 지시 문서를 정책 기준으로 평가하고, 컨텍스트 흐름을 진단해요.",
    features: [
      {
        title: "AI 지시 문서",
        lines: [
          "CLAUDE.md·AGENTS.md·SKILL.md를 파일 트리로 보여줘요.",
          "파일마다 정책 적합도를 평가하고, 개별 재평가도 할 수 있어요.",
        ],
      },
      {
        title: "🩺 AI 지시 문서 흐름 진단",
        lines: [
          "전체 정책과 프로젝트 정책이 AI 에이전트에 올바르게 전달되는지 진단해요.",
          "문제가 있으면 개선 방법도 함께 알려줘요.",
        ],
      },
    ],
  },
  {
    name: "히스토리",
    icon: Clock,
    screenshot: "/assets/images/guide/tab-history.png",
    desc: "세션별 토큰 사용량·에러 분포·모델 사용 현황을 차트로 보여주고, 작업 흐름을 타임라인으로 탐색해요.",
    features: [
      {
        title: "세션별 토큰 사용량",
        lines: [
          "도넛 차트로 세션별 토큰 소비량을 한눈에 비교해요.",
          "세션을 클릭하면 상세 작업 흐름으로 이동해요.",
        ],
      },
      {
        title: "기타 데이터",
        lines: [
          "모델 사용량(Opus·Sonnet·Haiku)과 에러 유형 분포를 바 차트로 확인해요.",
        ],
      },
      {
        title: "세션 흐름 그래프",
        lines: [
          "세션을 노드로 시각화해요. 색상이 품질 점수를 나타내요(초록=정상, 노랑=복잡, 빨강=에러).",
          "노드를 클릭하면 사용자 명령어·AI 작업·채팅 내역을 타임라인으로 볼 수 있어요.",
        ],
      },
    ],
  },
];

const CLI_STEPS = [
  { step: "1", title: "CLI 설치", code: "npm install -g @votra/cli" },
  { step: "2", title: "로그인", code: "votra signin" },
  { step: "3", title: "세션 실시간 업로드", code: "votra upload --project --watch" },
] as const;

const CLI_COMMANDS = [
  {
    cmd: "votra signin",
    desc: "브라우저 OAuth로 로그인",
    usage: "votra signin [url] [--port <n>] [--no-open]",
  },
  {
    cmd: "votra whoami",
    desc: "현재 로그인 계정 확인",
    usage: "votra whoami",
  },
  {
    cmd: "votra signout",
    desc: "로그아웃 및 인증 정보 삭제",
    usage: "votra signout",
  },
  {
    cmd: "votra upload",
    desc: "--watch로 세션 실시간 동기화",
    usage: "votra upload [file] [-w] [-p [path]] [--no-claude-files]",
  },
  {
    cmd: "votra inspect",
    desc: "이벤트·토큰·타입 분포 분석",
    usage: "votra inspect [file] [-t <type>] [-l <n>] [--raw]",
  },
  {
    cmd: "votra replay",
    desc: "세션을 정적 HTML 리플레이로 생성",
    usage: "votra replay [file] [-o <path>] [-w] [-p [path]] [-s [port]]",
  },
  {
    cmd: "votra claude-files",
    desc: "CLAUDE.md·AGENTS.md·SKILL.md 업로드",
    usage: "votra claude-files [-p <path>]",
  },
] as const;

function GuidePane() {
  return (
    <div className="flex flex-col gap-12">
      <header>
        <h2 className="text-xl font-semibold">안내</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          votra는 AI 에이전트 세션을 팀과 함께 분석하고 관리하는 도구예요.
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
                <div className="overflow-hidden rounded-lg border border-border">
                  <Image
                    src={tab.screenshot}
                    alt={`${tab.name} 화면`}
                    width={1200}
                    height={675}
                    className="w-full h-auto"
                  />
                </div>
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

      <section className="flex flex-col gap-4">
        <h3 className="text-base font-semibold">CLI 연동 방법</h3>
        <p className="text-sm text-muted-foreground">
          votra CLI를 설치하면 AI 에이전트 세션이 자동으로 웹 대시보드에 올라가요.
        </p>
        <ol className="flex flex-col gap-2">
          {CLI_STEPS.map(({ step, title, code }) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                {step}
              </span>
              <span className="w-28 shrink-0 text-sm font-medium">{title}</span>
              <code className="flex-1 rounded bg-[#F0EDE8] px-3 py-1.5 font-mono text-sm text-foreground">
                {code}
              </code>
            </li>
          ))}
        </ol>
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
    </div>
  );
}
