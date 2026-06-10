"use client";

import { CheckSquare, Circle, Clock, XCircle } from "lucide-react";

import type { TaskStatusValue } from "@/app/actions/getProjectTasks";
import { cn } from "@/lib/utils";

export function StatusIcon({ status, className }: { status: TaskStatusValue; className?: string }) {
  if (status === "DONE") return <CheckSquare className={cn("size-4 text-green-600", className)} />;
  if (status === "IN_PROGRESS") return <Clock className={cn("size-4 text-blue-600", className)} />;
  if (status === "CANCELLED") return <XCircle className={cn("size-4 text-red-500", className)} />;
  return <Circle className={cn("size-4 text-muted-foreground", className)} />;
}
