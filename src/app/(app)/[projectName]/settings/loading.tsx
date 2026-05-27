import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectSettingsLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col px-8 mb-6">
      <div className="mt-8 mx-auto w-full max-w-2xl flex flex-col gap-8">
        {/* 섹션: 프로젝트 기본 정보 */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <div className="flex flex-col gap-3">
            {/* 썸네일 */}
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-10" />
              <div className="flex items-center gap-4">
                <Skeleton className="size-16 shrink-0 rounded-md" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
            {/* 이름 */}
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-3 w-12" />
            </div>
            {/* 설명 */}
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          {/* 저장 버튼 */}
          <Skeleton className="h-9 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}
