import type { ComponentType, SVGProps } from "react";

import IC_Add from "@/assets/icons/ic_add.svg";
import IC_Arrow_Forward from "@/assets/icons/ic_arrow_forward.svg";
import IC_Sidenav from "@/assets/icons/ic_sidenav.svg";
import { cn } from "@/lib/utils";

/**
 * 등록된 아이콘만 사용 가능. 새 아이콘은 `src/assets/icons/` 에 SVG 추가 후
 * 아래 ICON_REGISTRY 에 한 줄 등록하면 IconName 타입이 자동 확장돼요.
 */
const ICON_REGISTRY = {
  IC_Add,
  IC_Arrow_Forward,
  IC_Sidenav,
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export type IconName = keyof typeof ICON_REGISTRY;

const ICON_SIZE = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export type IconSize = keyof typeof ICON_SIZE;

export type IconProps = {
  icon: IconName;
  size?: IconSize;
  className?: string;
};

export function Icon({ icon, size = "md", className }: IconProps) {
  const Svg = ICON_REGISTRY[icon];
  return (
    <Svg className={cn(ICON_SIZE[size], className)} aria-hidden focusable={false} />
  );
}
