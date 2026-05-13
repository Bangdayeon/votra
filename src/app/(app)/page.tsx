"use client";

import { FolderTree } from "@/components/FolderTree";
import { useProjects } from "@/components/ProjectsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AGENT_BADGE: Record<string, string> = {
  claude: "bg-[#E0A57B]",
  gpt: "bg-[#74AA9C]",
  gemini: "bg-[#4285F4]",
};

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-background p-6 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const { selected } = useProjects();

  if (!selected) {
    return (
      <div className="flex flex-col gap-2 h-full items-center justify-center px-8 py-6 text-sm text-muted-foreground">
        <p>아직 등록된 프로젝트가 없어요.</p>
        <p>프로젝트 추가 버튼을 눌러 프로젝트를 추가해주세요.</p>
      </div>
    );
  }

  const badgeColor = selected.agent
    ? (AGENT_BADGE[selected.agent] ?? "bg-muted-foreground")
    : null;

  return (
    <div className="flex h-full flex-col px-8 py-6">
      <Tabs defaultValue="overview" className="flex flex-1 flex-col gap-6">
        <TabsList className="border-b border-[#C5C5C5]">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="branch">브랜치</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 pb-10">
          <div className="grid grid-cols-2 gap-6">
            <Card className="col-span-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                {selected.agent && badgeColor && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium text-white ${badgeColor}`}
                  >
                    {selected.agent}
                  </span>
                )}
              </div>
              {selected.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {selected.description}
                </p>
              )}
            </Card>

            <Card className="row-span-2 min-h-[480px]">
              <h3 className="text-base font-semibold">아키텍처</h3>
              {selected.structure && selected.structure.length > 0 ? (
                <div className="mt-3">
                  <FolderTree
                    tree={selected.structure.map((n) => ({
                      ...n,
                      defaultOpen: n.name === "src",
                    }))}
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  폴더 구조 정보가 아직 없어요.
                </p>
              )}
            </Card>

            <Card>
              <h3 className="text-base font-semibold">토큰 사용량</h3>
              <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
                <span>session별 사용량</span>
                <span>retry 비용</span>
                <span>model usage</span>
                <span>estimated cost</span>
              </div>
            </Card>

            <Card>
              <p className="text-sm text-foreground">
                또 뭘 보여주지.. 없으면 없애도 됨.. 세션 개수? 가이드 문서?
              </p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="branch" className="flex-1">
          <Card>
            <p className="text-sm text-muted-foreground">
              {selected.name} 의 브랜치 내용은 준비 중이에요.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
