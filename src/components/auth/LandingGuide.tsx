"use client";

import Image from "next/image";
import { Check, Copy, Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AxhubSignInButton } from "@/components/auth/AxhubSignInButton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { cn } from "@/lib/utils";

const TABS = ["votra 소셜 로그인", "MCP 설치", "brief, task"] as const;
type Tab = (typeof TABS)[number];

export function LandingGuide() {
  const [active, setActive] = useState<Tab>("votra 소셜 로그인");
  const [visible, setVisible] = useState(true);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const i = TABS.indexOf(active);
    const el = tabRefs.current[i];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active]);

  const handleTab = (tab: Tab) => {
    if (tab === active) return;
    setVisible(false);
    setTimeout(() => {
      setActive(tab);
      setVisible(true);
    }, 150);
  };

  return (
    <section className="px-4 py-24">
      <div className="mx-auto flex max-w-4xl flex-col gap-12">
        <header className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">votra 3분만에 시작하기</h2>
        </header>

        <div className="relative flex justify-center gap-2">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              onClick={() => handleTab(tab)}
              className={cn(
                "cursor-pointer px-8 pb-5 text-sm font-medium transition-colors",
                active === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {i + 1}
                </span>
                {tab}
              </span>
            </button>
          ))}
          <div
            className="absolute bottom-0 h-[3px] rounded-full bg-purple-600 transition-all duration-300"
            style={{ left: indicator.left, width: indicator.width }}
          />
        </div>

        <div
          className={cn(
            "mx-auto w-full max-w-2xl transition-all duration-150",
            visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          {active === "votra 소셜 로그인" && <SocialLoginContent />}
          {active === "MCP 설치" && <McpInstallContent />}
          {active === "brief, task" && <BriefTaskContent />}
        </div>
      </div>
    </section>
  );
}

function CodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-1 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
      <code className="font-mono text-sm">{code}</code>
      <button
        type="button"
        onClick={copy}
        className="ml-3 shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
        aria-label="복사"
      >
        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

function Step({ n, label, children }: { n: number; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-bold text-foreground">
        {n}
      </span>
      <div className="flex flex-col gap-1 pt-0.5">
        <span className="text-sm font-medium">{label}</span>
        {children}
      </div>
    </div>
  );
}

function SocialLoginContent() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <div className="flex flex-col gap-4">
        <span className="text-sm font-medium">이 페이지에서 소셜 로그인</span>
        <div className="flex flex-col gap-3">
          <AxhubSignInButton />
          <GoogleSignInButton />
        </div>
      </div>
      <Image
        src="/images/guide/tab-overview.png"
        alt="votra 대시보드 미리보기"
        width={600}
        height={400}
        className="w-full rounded-xl"
      />
    </div>
  );
}

function McpInstallContent() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <Step n={1} label="CLI 설치">
        <CodeCopy code="npm install -g @votra/cli" />
      </Step>

      <Step n={2} label="MCP 서버 등록">
        <span className="mt-1 text-xs text-muted-foreground">
          연결할 에이전트를 지정해서 등록해요. 여러 에이전트에 동시에 등록할 수 있어요.
        </span>
        <CodeCopy code="votra install" />
        <span className="text-xs text-muted-foreground">기본값은 claude예요.</span>
        <div className="mt-1 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-muted p-3 font-mono text-xs">
          {[
            ["votra install cursor", "Cursor"],
            ["votra install gemini", "Gemini CLI"],
            ["votra install codex", "Codex"],
            ["votra install antigravity", "Antigravity"],
            ["votra install all", "모든 에이전트에 한번에 등록"],
          ].map(([cmd, desc]) => (
            <>
              <code key={cmd} className="text-foreground">{cmd}</code>
              <span key={desc} className="text-muted-foreground"># {desc}</span>
            </>
          ))}
        </div>
      </Step>

      <Step n={3} label="새 세션에서 로그인">
        <span className="mt-1 text-xs text-muted-foreground">
          프로젝트 루트에서 새 세션을 열고 아래 명령어를 말해보세요.
        </span>
        <CodeCopy code="votra signin" />
        <Image
          src="/images/guide/tab-mcp-signin.png"
          alt="votra signin 예시"
          width={600}
          height={360}
          className="mt-2 w-full rounded-xl"
        />
      </Step>
    </div>
  );
}

function BriefTaskContent() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xl font-bold">brief</span>
        <p className="text-sm text-muted-foreground">첫 실행으로 프로젝트를 등록할 수 있어요.</p>
        <p className="text-sm text-muted-foreground">이후 생성되는 커밋 기록과 태스크로 프로젝트 현황을 조회할 수 있어요.</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xl font-bold">task</span>
        <p className="text-sm text-muted-foreground">프로젝트 현황 데이터 기반으로 다음 태스크를 추천해줘요.</p>
        <p className="text-sm text-muted-foreground">원하는 태스크를 생성하라고 에이전트에게 요청하면 얼마든지 생성해줘요.</p>
        <p className="text-sm text-muted-foreground">작업을 진행할 태스크를 에이전트에게 요청해서 작업을 시작해보세요.</p>
      </div>
    </div>
  );
}
