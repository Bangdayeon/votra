import { useState } from "react";
import { toast } from "sonner";

type Options = {
  successMessage?: string;
  defaultErrorMessage?: string;
};

export function useRefreshWithToast() {
  const [refreshing, setRefreshing] = useState(false);

  async function run<T>(
    fn: () => Promise<T>,
    options?: Options & { onSuccess?: (result: T) => void },
  ): Promise<void> {
    setRefreshing(true);
    try {
      const result = await fn();
      options?.onSuccess?.(result);
      if (options?.successMessage) toast.success(options.successMessage);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : (options?.defaultErrorMessage ?? "오류가 발생했어요."),
      );
    } finally {
      setRefreshing(false);
    }
  }

  return { refreshing, run };
}
