"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  /** 이동할 경로. 제공되면 Link 로 렌더링, 없으면 onClick 버튼 */
  href?: string;
  onClick?: () => void;
  /** true 면 텍스트 없이 썸네일만 (사이드바 접힌 상태) */
  compact?: boolean;
  /** 수정 메뉴 핸들러. onEdit + onDelete 둘 다 주면 우측에 ⋯ 메뉴 노출 */
  onEdit?: () => void;
  /** 삭제 메뉴 핸들러 */
  onDelete?: () => void;
  className?: string;
};

export function SideNavMenuItem({
  title,
  image,
  selected,
  href,
  onClick,
  compact = false,
  onEdit,
  onDelete,
  className,
}: SideNavMenuItemProps) {
  if (compact) {
    const ringCls = selected
      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
      : "ring-0";
    const inner = image ? (
      <Image
        src={image}
        alt=""
        width={28}
        height={28}
        className="size-7 rounded-full object-cover"
        aria-hidden
      />
    ) : (
      <span
        className="size-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
        style={{ backgroundColor: colorFromTitle(title) }}
        aria-hidden
      >
        {title.charAt(0)}
      </span>
    );
    const compactClassName = cn(
      "inline-flex items-center justify-center size-9 cursor-pointer rounded-full p-0 transition-shadow hover:bg-accent",
      ringCls,
      className,
    );
    if (href) {
      return (
        <Link
          href={href}
          title={title}
          aria-label={title}
          className={compactClassName}
        >
          {inner}
        </Link>
      );
    }
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClick}
        title={title}
        aria-label={title}
        className={cn(
          "size-9 cursor-pointer rounded-full p-0 transition-shadow",
          ringCls,
          className,
        )}
      >
        {inner}
      </Button>
    );
  }

  const hasMenu = onEdit !== undefined || onDelete !== undefined;

  const rowClassName = cn(
    "inline-flex items-center gap-2 w-full cursor-pointer justify-start rounded-full px-1 py-2 text-sm font-normal hover:bg-accent hover:text-accent-foreground",
    hasMenu && "pr-9",
    selected &&
      "bg-primary/15 font-semibold text-primary hover:bg-primary/20 hover:text-primary",
    className,
  );

  const rowContent = (
    <>
      {image ? (
        <Image
          src={image}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full object-cover"
          aria-hidden
        />
      ) : (
        <span
          className="size-7 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ backgroundColor: colorFromTitle(title) }}
          aria-hidden
        >
          {title.charAt(0)}
        </span>
      )}
      <span className="truncate">{title}</span>
    </>
  );

  return (
    <div className="relative">
      {href ? (
        <Link href={href} className={rowClassName}>
          {rowContent}
        </Link>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={onClick}
          className={rowClassName}
        >
          {rowContent}
        </Button>
      )}

      {hasMenu && (
        <RowMenu
          title={title}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function RowMenu({
  title,
  onEdit,
  onDelete,
}: {
  title: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${title} 메뉴`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-2 top-[47%] flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-opacity hover:bg-purple-300 hover:text-foreground focus:opacity-100",
            // 기본은 숨김, 부모 row 호버 시 노출. 메뉴 열려있을 땐 계속 노출.
            "opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100",
          )}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="right"
        sideOffset={4}
        className="w-36 p-1"
      >
        <div className="flex flex-col">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Pencil className="size-4 text-muted-foreground" />
              수정하기
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              삭제하기
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
