"use client";

import Link from "next/link";
import { User, Settings, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "./global-search";
import { Logo } from "./logo";
import { useSignOut } from "@/lib/hooks/use-sign-out";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { signOut } = useSignOut();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      {/* Logo for mobile */}
      <div className="md:hidden">
        <Logo href="/spaces" />
      </div>

      {/* Global Search - desktop only */}
      <div className="hidden md:flex flex-1">
        <GlobalSearch />
      </div>

      {/* Spacer to push right side actions on mobile */}
      <div className="flex-1 md:hidden" />

      {/* Right side actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle className="size-11 sm:size-9" />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 sm:size-9 rounded-full"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                <User className="size-4" />
              </div>
              <span className="sr-only">{labels.nav.userMenu}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="size-4" />
                {labels.nav.profile}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="size-4" />
                {labels.nav.settings}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus-visible:text-destructive"
            >
              <LogOut className="size-4" />
              {labels.common.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
