"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#F38B7B",
  "#7BC67E",
  "#7BA6E0",
  "#E0B97B",
  "#B07BE0",
  "#E07BB6",
  "#7BE0D4",
];

function colorFromTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export type SideNavMenuItemProps = {
  title: string;
  image?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function SideNavMenuItem({
  title,
  image,
  selected,
  onClick,
  className,
}: SideNavMenuItemProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full justify-start rounded-full px-3 py-2 text-sm font-normal",
        selected &&
          "bg-primary/15 font-semibold text-primary hover:bg-primary/20 hover:text-primary",
        className
      )}
    >
      {image ? (
        <Image
          src={image}
          alt=""
          width={12}
          height={12}
          className="size-3 shrink-0 rounded-full object-cover"
          aria-hidden
        />
      ) : (
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: colorFromTitle(title) }}
          aria-hidden
        />
      )}
      <span className="truncate">{title}</span>
    </Button>
  );
}
