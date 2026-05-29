"use client";

import {
  Bot,
  CheckCircle2,
  LayoutGrid,
  ListChecks,
  Plug,
  Terminal,
  Users,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const TABS = ["빠른 시작", "주요 기능", "MCP 툴"] as const;
type Tab = (typeof TABS)[number];

const FEATURES = [
  {
    icon: LayoutGrid,
    name: "개요",
    desc: "최근 커밋 기록과 작업 내용을 분석해 프로젝트 현황과 추천 작업을 한눈에 보여줘요.",
    details: ["AI 요약 & 이슈 경고", "다음 작업 추천"],
  },
  {
    icon: ListChecks,
    name: "태스크",
    desc: "votra MCP를 통해 에이전트가 등록한 태스크를 관리하고 폴더별로 흐름을 파악해요.",
    details: ["실시간 태스크 현황", "이력 및 핵심 결정 보관"],
  },
  {
    icon: Bot,
    name: "AI 프롬프트 관리",
    desc: "프로젝트 AI 문서를 정책 기준으로 평가하고 문서 간 맥락 흐름을 진단해요.",
    details: ["정책 적합도 피드백", "맥락 손실 구간 진단"],
  },
  {
    icon: Users,
    name: "팀작업",
    desc: "프로젝트를 팀과 공유하여 멤버 모두가 태스크 상태를 함께 확인해요.",
    details: ["공유 프로젝트"],
  },
] as const;

const MCP_TOOLS = [
  { tool: "brief", desc: "세션 시작 브리핑 — 태스크·결정·추천 작업 한번에 조회" },
  { tool: "recall", desc: "과거 결정·인사이트를 의미 기반으로 검색" },
  { tool: "add_task", desc: "새 태스크 등록" },
  { tool: "start_task", desc: "태스크 등록 후 즉시 IN_PROGRESS로 시작" },
  { tool: "update_task", desc: "태스크 상태·내용 변경" },
  { tool: "finish_task", desc: "태스크 완료 처리 — 요약·핵심 결정 함께 저장" },
  { tool: "list_tasks", desc: "태스크 목록 조회 (상태·모듈 필터 가능)" },
  { tool: "task_detail", desc: "태스크 상세 정보 조회" },
  { tool: "log_session", desc: "세션 종료 전 작업 요약 저장" },
  { tool: "upload_prompt", desc: "CLAUDE.md·AGENTS.md·SKILL.md 업로드" },
  { tool: "load_skill", desc: "컨텍스트별 스킬 지침 로드" },
  { tool: "signin", desc: "브라우저 OAuth로 votra 계정 로그인" },
  { tool: "whoami", desc: "현재 로그인 계정 확인" },
  { tool: "signout", desc: "로그아웃 및 인증 정보 삭제" },
] as const;

export function LandingGuide() {
  const [active, setActive] = useState<Tab>("빠른 시작");
  const [visible, setVisible] = useState(true);

  const handleTab = (tab: Tab) => {
    if (tab === active) return;
    setVisible(false);
    setTimeout(() => {
      setActive(tab);
      setVisible(true);
    }, 150);
  };

  return (
    <section className="border-t border-border px-4 py-24">
      <div className="mx-auto flex max-w-4xl flex-col gap-12">
        <header className="flex flex-col gap-3 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">어떻게 사용하나요?</h2>
          <p className="text-muted-foreground">
            CLI 하나로 시작해, MCP로 에이전트와 자연스럽게 연동해요.
          </p>
        </header>

        <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTab(tab)}
              className={cn(
                "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                active === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div
          className={cn(
            "transition-all duration-150",
            visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          {active === "빠른 시작" && <QuickStartContent />}
          {active === "주요 기능" && <FeaturesContent />}
          {active === "MCP 툴" && <McpToolsContent />}
        </div>
      </div>
    </section>
  );
}

function QuickStartContent() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
            1
          </span>
          <span className="w-32 shrink-0 text-sm font-medium">CLI 설치</span>
          <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm">
            npm install -g @votra/cli
          </code>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
            2
          </span>
          <span className="w-32 shrink-0 text-sm font-medium">MCP 서버 등록</span>
          <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm">
            votra install
          </code>
        </div>
        <div className="flex items-start gap-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
            3
          </span>
          <div className="flex flex-col gap-0.5 pt-0.5">
            <span className="text-sm font-medium">Claude Code 재시작 → signin 툴로 로그인</span>
            <span className="text-xs text-muted-foreground">
              재시작 후 votra-memory MCP 서버가 활성화돼요.
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">지원 도구</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Claude Code", "Cursor", "Gemini CLI", "Codex"].map((tool) => (
            <span
              key={tool}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
            >
              {tool}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          <code className="font-mono">votra install all</code>로 모든 도구에 한번에 등록할 수 있어요.
        </p>
      </div>
    </div>
  );
}

function FeaturesContent() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {FEATURES.map(({ icon: Icon, name, desc, details }) => (
        <div
          key={name}
          className="flex flex-col gap-3 rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">{name}</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
          <div className="flex flex-col gap-1">
            {details.map((d) => (
              <div key={d} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3 shrink-0 text-primary/60" />
                <span className="text-xs text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function McpToolsContent() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Plug className="size-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          votra-memory MCP 서버에서 제공하는 툴 목록이에요. 에이전트가 자동으로 호출해요.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        {MCP_TOOLS.map(({ tool, desc }, i) => (
          <div
            key={tool}
            className={cn(
              "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50",
              i !== 0 && "border-t border-border",
            )}
          >
            <code className="w-28 shrink-0 font-mono text-sm font-semibold text-foreground">
              {tool}
            </code>
            <span className="text-sm text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
