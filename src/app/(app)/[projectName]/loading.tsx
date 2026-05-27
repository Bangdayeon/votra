import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 w-full">
      {children}
    </div>
  );
}

function CardHeaderSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
      <div className="flex w-full items-center justify-between gap-3 mb-1 lg:w-auto lg:justify-start">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="self-end h-3 w-28 lg:self-auto" />
    </div>
  );
}

export default function ProjectLoading() {
  return (
    <div className="flex flex-col gap-6 px-8 py-6 pb-6">
      {/* AiSummaryCard 스켈레톤 */}
      <CardSkeleton>
        <CardHeaderSkeleton />
        {/* 프로젝트 상태 요약 섹션 */}
        <div className="mt-4">
          <Skeleton className="h-5 w-36 mb-2" />
          <div className="flex flex-col gap-3 pl-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
        {/* 제안 섹션 */}
        <div className="mt-5">
          <Skeleton className="h-5 w-16 mb-2" />
          <div className="flex flex-col gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </CardSkeleton>

      {/* RecommendedNextTaskCard 스켈레톤 */}
      <CardSkeleton>
        <CardHeaderSkeleton />
        <div className="mt-4 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-start gap-1.5">
              <Skeleton className="h-4 w-7 rounded" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </CardSkeleton>
    </div>
  );
}
