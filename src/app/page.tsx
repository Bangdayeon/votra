"use client";

import { ChevronDown, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icon } from "@/components/Icon";

export default function HomePage() {
  return (
    <TooltipProvider>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 p-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">Votra</h1>
          <p className="text-muted-foreground">
            Next.js 15 · Tailwind v4 · shadcn/ui · pnpm · light DDD
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Button + Tooltip</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings />
                </Button>
              </TooltipTrigger>
              <TooltipContent>설정</TooltipContent>
            </Tooltip>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Input</h2>
          <Input placeholder="이메일을 입력하세요" type="email" />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Tabs (tabmenu)</h2>
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">계정</TabsTrigger>
              <TabsTrigger value="password">비밀번호</TabsTrigger>
              <TabsTrigger value="billing">결제</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="pt-4 text-sm">
              계정 탭 내용
            </TabsContent>
            <TabsContent value="password" className="pt-4 text-sm">
              비밀번호 탭 내용
            </TabsContent>
            <TabsContent value="billing" className="pt-4 text-sm">
              결제 탭 내용
            </TabsContent>
          </Tabs>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Dropdown + Popover + Modal</h2>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  메뉴 <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>프로필</DropdownMenuItem>
                <DropdownMenuItem>설정</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Popover 열기</Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">알림</p>
                  <p className="text-muted-foreground text-sm">
                    팝오버 안의 임의 콘텐츠
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            <Dialog>
              <DialogTrigger asChild>
                <Button>Modal 열기</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>프로필 수정</DialogTitle>
                  <DialogDescription>
                    프로필 정보를 변경할 수 있어요.
                  </DialogDescription>
                </DialogHeader>
                <Input placeholder="이름" />
                <DialogFooter>
                  <Button variant="outline">취소</Button>
                  <Button>저장</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Icon icon='IC_Add' size='md' className="text-red-400" />
        </section>
      </main>
    </TooltipProvider>
  );
}
