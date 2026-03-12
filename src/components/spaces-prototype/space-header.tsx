"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

type SpaceHeaderProps = {
  title: string;
  showBack?: boolean;
  subtitle?: string;
  className?: string;
};

export function SpaceHeader({
  title,
  showBack = false,
  subtitle,
  className,
}: SpaceHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 h-14 shrink-0",
        className,
      )}
    >
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => router.push("/spaces")}
          aria-label="Back to spaces"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {!showBack && <ThemeToggle />}
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          aria-label="Space info"
        >
          <Info className="size-5" />
        </Button>
      )}
    </header>
  );
}
