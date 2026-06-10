"use client";

import { FolderOpen } from "lucide-react";

import { FOLDER_ICON_OPTIONS, getFolderColors } from "./taskConstants";

export function FolderIconDisplay({
  icon,
  color,
  className,
}: {
  icon: string | null;
  color: string | null;
  className?: string;
}) {
  const found = FOLDER_ICON_OPTIONS.find((o) => o.value === icon);
  const IconComp = found?.Icon ?? FolderOpen;
  const { fg } = getFolderColors(color);
  return <IconComp className={className} style={{ color: fg }} />;
}
