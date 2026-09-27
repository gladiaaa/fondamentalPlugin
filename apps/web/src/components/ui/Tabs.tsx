"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn("flex flex-wrap gap-1 border-b border-line", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: RadixTabs.TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-[1.1em] py-[.9em] font-medium text-[.92rem] text-muted cursor-pointer hover:text-text data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: RadixTabs.TabsContentProps) {
  return <RadixTabs.Content className={cn("grid gap-[18px]", className)} {...props} />;
}
