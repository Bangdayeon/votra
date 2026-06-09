"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <p className="text-sm text-muted-foreground">오류 발생</p>
      <h1 className="text-xl font-semibold">페이지를 불러오지 못했어요</h1>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
