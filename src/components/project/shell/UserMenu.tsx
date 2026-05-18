"use client";

import Image from "next/image";
import { CircleUserRound, LogOut, MoreHorizontal, Settings } from "lucide-react";
import { useState, useTransition } from "react";

import { signOutAction } from "@/app/actions/signOut";
import { updateProfileAppearanceAction } from "@/app/actions/updateProfileAppearance";
import { AccountSettingsDialog } from "@/components/project/shell/AccountSettingsDialog";
import { useCurrentUser } from "@/components/project/shell/CurrentUserContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PROFILE_COLORS, PROFILE_IMAGES } from "@/domain/user/profileAppearance";
import { cn } from "@/lib/utils";

function Avatar({
  color,
  image,
  fallbackChar,
  size = 28,
}: {
  color: string | null;
  image: string | null;
  fallbackChar: string;
  size?: number;
}) {
  if (!color && !image) {
    return (
      <CircleUserRound
        className="shrink-0 text-muted-foreground"
        strokeWidth={1.5}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color ? `#${color}` : "transparent",
      }}
    >
      {image ? (
        <Image
          src={image}
          alt="프로필 이미지"
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold text-white">
          {fallbackChar.toUpperCase()}
        </span>
      )}
    </span>
  );
}

function AppearancePicker({
  currentColor,
  currentImage,
}: {
  currentColor: string | null;
  currentImage: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticColor, setOptimisticColor] = useState(currentColor);
  const [optimisticImage, setOptimisticImage] = useState(currentImage);

  const pickColor = (color: string) => {
    setOptimisticColor(color);
    startTransition(async () => {
      await updateProfileAppearanceAction({ kind: "color", value: color });
    });
  };

  const pickImage = (image: string) => {
    setOptimisticImage(image);
    startTransition(async () => {
      await updateProfileAppearanceAction({ kind: "image", value: image });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">색상</span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {PROFILE_COLORS.map((color) => {
            const selected = optimisticColor === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => pickColor(color)}
                disabled={pending}
                aria-label={`색상 #${color}`}
                aria-pressed={selected}
                className={cn(
                  "relative size-7 rounded-full transition-transform hover:scale-110 disabled:opacity-50",
                  selected && "ring-2 ring-foreground ring-offset-2",
                )}
                style={{ backgroundColor: `#${color}` }}
              >
                {selected && (
                  <span className="absolute inset-0 m-auto size-2 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">이미지</span>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {PROFILE_IMAGES.map((image) => {
            const selected = optimisticImage === image;
            return (
              <button
                key={image}
                type="button"
                onClick={() => pickImage(image)}
                disabled={pending}
                aria-label="프로필 이미지 선택"
                aria-pressed={selected}
                className={cn(
                  "size-12 overflow-hidden rounded-full transition-transform hover:scale-105 disabled:opacity-50",
                  selected && "ring-2 ring-foreground ring-offset-2",
                )}
                style={{
                  backgroundColor: optimisticColor
                    ? `#${optimisticColor}`
                    : "var(--muted)",
                }}
              >
                <Image
                  src={image}
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AccountMenu({
  align = "end",
  side = "top",
  trigger,
  onOpenSettings,
}: {
  align?: "start" | "end" | "center";
  side?: "top" | "bottom" | "left" | "right";
  trigger: React.ReactNode;
  onOpenSettings: () => void;
}) {
  const [signOutPending, startSignOut] = useTransition();
  const handleSignOut = () => {
    startSignOut(async () => {
      await signOutAction();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-40">
        <DropdownMenuItem onSelect={onOpenSettings}>
          <Settings className="size-4" />
          설정
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleSignOut();
          }}
          disabled={signOutPending}
          variant="destructive"
        >
          <LogOut className="size-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const displayName = user.name ?? user.email.split("@")[0];
  const fallbackChar = displayName.charAt(0) || "?";

  const avatarTrigger = (
    <button
      type="button"
      title={`${displayName} 프로필`}
      aria-label="프로필 메뉴 열기"
      className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Avatar
        color={user.profileColor}
        image={user.profileImage}
        fallbackChar={fallbackChar}
        size={28}
      />
    </button>
  );

  if (compact) {
    return (
      <>
        <Popover>
          <PopoverTrigger asChild>{avatarTrigger}</PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-64">
            <AppearancePicker
              currentColor={user.profileColor}
              currentImage={user.profileImage}
            />
            <div className="mt-4 flex flex-col gap-1 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="w-full justify-start gap-2"
              >
                <Settings className="size-4" />
                설정
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOutAction();
                }}
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              >
                <LogOut className="size-4" />
                로그아웃
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <AccountSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>{avatarTrigger}</PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-64">
            <AppearancePicker
              currentColor={user.profileColor}
              currentImage={user.profileImage}
            />
          </PopoverContent>
        </Popover>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{displayName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
        <AccountMenu
          align="end"
          side="top"
          onOpenSettings={() => setSettingsOpen(true)}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="계정 메뉴"
              aria-label="계정 메뉴 열기"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
      </div>
      <AccountSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}
