import {
  Bookmark,
  Box,
  Briefcase,
  Code2,
  Flag,
  Folder,
  Heart,
  Layers,
  Star,
  Tag,
  Target,
  Zap,
} from "lucide-react";

import type { TaskStatusValue } from "@/app/actions/getProjectTasks";
import type { TaskSortBy } from "@/domain/memory/types";

export const FOLDER_ICON_OPTIONS = [
  { value: "folder", Icon: Folder },
  { value: "star", Icon: Star },
  { value: "bookmark", Icon: Bookmark },
  { value: "tag", Icon: Tag },
  { value: "zap", Icon: Zap },
  { value: "heart", Icon: Heart },
  { value: "flag", Icon: Flag },
  { value: "code2", Icon: Code2 },
  { value: "layers", Icon: Layers },
  { value: "target", Icon: Target },
  { value: "box", Icon: Box },
  { value: "briefcase", Icon: Briefcase },
] as const;

export const FOLDER_COLOR_OPTIONS = [
  { value: "gray",   bg: "#f3f4f6", fg: "#374151" },
  { value: "red",    bg: "#fee2e2", fg: "#b91c1c" },
  { value: "orange", bg: "#ffedd5", fg: "#c2410c" },
  { value: "yellow", bg: "#fef9c3", fg: "#a16207" },
  { value: "green",  bg: "#dcfce7", fg: "#15803d" },
  { value: "blue",   bg: "#dbeafe", fg: "#1d4ed8" },
  { value: "purple", bg: "#f3e8ff", fg: "#7e22ce" },
  { value: "pink",   bg: "#fce7f3", fg: "#be185d" },
  { value: "cyan",   bg: "#cffafe", fg: "#0e7490" },
] as const;

export type FolderIconValue = (typeof FOLDER_ICON_OPTIONS)[number]["value"];
export type FolderColorValue = (typeof FOLDER_COLOR_OPTIONS)[number]["value"];

export function getFolderColors(color: string | null): { bg: string; fg: string } {
  return FOLDER_COLOR_OPTIONS.find((c) => c.value === color) ?? { bg: "#dbeafe", fg: "#1d4ed8" };
}

export type PriorityLevel = 0 | 1 | 2 | 3 | 4;

export const PRIORITY_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
};

export const PRIORITY_STYLES: Record<1 | 2 | 3 | 4, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
};

export const PRIORITY_CREATE_OPTIONS = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
  { value: 4, label: "Critical" },
] as const;

export const PRIORITY_ACTIVE_STYLES: Record<number, string> = {
  0: "border-border bg-muted text-foreground",
  1: "border-green-300 bg-green-100 text-green-700",
  2: "border-yellow-300 bg-yellow-100 text-yellow-700",
  3: "border-orange-300 bg-orange-100 text-orange-700",
  4: "border-red-300 bg-red-100 text-red-700",
};

export const NEXT_STATUS: Partial<Record<TaskStatusValue, TaskStatusValue>> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "PENDING",
};

export const STATUS_ACTION_LABELS: Record<TaskStatusValue, string> = {
  PENDING: "대기 상태로 변경",
  IN_PROGRESS: "진행 중으로 변경",
  DONE: "완료로 변경",
  CANCELLED: "취소로 변경",
};

export const STATUS_TOAST_MESSAGES: Partial<Record<TaskStatusValue, string>> = {
  IN_PROGRESS: "진행 중으로 변경됐어요.",
  DONE: "완료로 변경됐어요.",
  PENDING: "대기로 변경됐어요.",
};

export type FolderView =
  | { kind: "list" }
  | { kind: "folder"; id: string; name: string }
  | { kind: "unclassified" }
  | { kind: "all" };

export const TASK_TITLE_MAX = 80;
export const TASK_DESC_MAX = 2000;

export function fmtDate(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtDateLong(d: Date) {
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

export const SORT_OPTIONS: { label: string; value: TaskSortBy }[] = [
  { label: "중요도순", value: "priority" },
  { label: "등록일순", value: "createdAt" },
  { label: "수정일순", value: "updatedAt" },
];

export type StatusFilter = "ALL" | TaskStatusValue;

export const PAGE_SIZE = 20;
