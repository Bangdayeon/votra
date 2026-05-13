"use client";

import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type FolderNode = {
  name: string;
  color?: FolderColor;
  children?: FolderNode[];
  /** 이 노드를 초기에 펼친 상태로 둘지. 미지정 시 부모 FolderTree 의 defaultOpen 을 따라감 */
  defaultOpen?: boolean;
};

export type FolderColor =
  | "amber"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "rose"
  | "gray";

const COLOR_CLASS: Record<FolderColor, string> = {
  amber: "text-amber-500",
  yellow: "text-yellow-400",
  green: "text-emerald-500",
  blue: "text-sky-500",
  purple: "text-violet-500",
  rose: "text-rose-500",
  gray: "text-neutral-400",
};

const ROW = "flex w-full items-center gap-1 rounded px-1 py-0.5 text-sm hover:bg-accent";
const INDENT_PX = 14;

export function FolderTree({
  tree,
  defaultOpen = false,
}: {
  tree: FolderNode[];
  defaultOpen?: boolean;
}) {
  return (
    <ul className="select-none">
      {tree.map((node, i) => (
        <FolderItem
          key={`${node.name}-${i}`}
          node={node}
          depth={0}
          defaultOpen={defaultOpen}
        />
      ))}
    </ul>
  );
}

function FolderItem({
  node,
  depth,
  defaultOpen,
}: {
  node: FolderNode;
  depth: number;
  defaultOpen: boolean;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const [open, setOpen] = useState(node.defaultOpen ?? defaultOpen);
  const colorCls = node.color ? COLOR_CLASS[node.color] : "text-muted-foreground";

  const Chevron = open ? ChevronDown : ChevronRight;
  const Icon = open && hasChildren ? FolderOpen : Folder;

  return (
    <li>
      <button
        type="button"
        onClick={() => hasChildren && setOpen((v) => !v)}
        disabled={!hasChildren}
        className={cn(ROW, !hasChildren && "cursor-default")}
        style={{ paddingLeft: depth * INDENT_PX + 4 }}
      >
        {hasChildren ? (
          <Chevron className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon className={cn("size-4 shrink-0", colorCls)} />
        <span className="truncate text-foreground">{node.name}</span>
      </button>
      {hasChildren && open && (
        <ul>
          {node.children!.map((child, i) => (
            <FolderItem
              key={`${child.name}-${i}`}
              node={child}
              depth={depth + 1}
              defaultOpen={defaultOpen}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
