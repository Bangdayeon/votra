"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        month_caption: "flex justify-center items-center relative h-8",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 flex justify-between items-center px-1",
        button_previous: cn(
          "size-7 flex items-center justify-center rounded-md border border-border bg-transparent",
          "text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer",
          "disabled:opacity-40 disabled:pointer-events-none transition-colors",
        ),
        button_next: cn(
          "size-7 flex items-center justify-center rounded-md border border-border bg-transparent",
          "text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer",
          "disabled:opacity-40 disabled:pointer-events-none transition-colors",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-center text-[0.75rem] text-muted-foreground font-normal py-1",
        week: "flex mt-1",
        day: "relative p-0 text-center",
        day_button: cn(
          "size-8 flex items-center justify-center rounded-md text-sm",
          "hover:bg-accent hover:text-accent-foreground cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:opacity-40 disabled:pointer-events-none transition-colors",
        ),
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        today: "[&>button]:font-semibold [&>button]:underline",
        outside: "opacity-40",
        disabled: "opacity-40",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
