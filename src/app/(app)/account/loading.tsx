import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div className="flex h-full min-h-0">
      {/* 왼쪽 메뉴 nav */}
      <nav className="flex w-[220px] shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3">
        <Skeleton className="mx-2 mb-2 h-4 w-8" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-md px-3 py-2.5">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </nav>

      {/* 오른쪽 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-8 pt-8 pb-12">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-10">
          {/* 헤더 */}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* 섹션: 아이디 변경 */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-80 mt-1" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-14 rounded-md" />
            </div>
          </div>

          {/* 섹션: 화면 테마 */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>

          {/* 섹션: 로그아웃 */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-52 mt-1" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
