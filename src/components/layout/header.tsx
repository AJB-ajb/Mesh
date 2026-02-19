"use client";

import Link from "next/link";
import { Bell, User, Settings, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { GlobalSearch } from "./global-search";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useSignOut } from "@/lib/hooks/use-sign-out";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { unreadCount, userInitials } = useNotifications();
  const { signOut } = useSignOut();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      {/* Spacer for mobile menu button */}
      <div className="w-10 md:hidden" />

      {/* Global Search */}
      <GlobalSearch />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/inbox">
            <Bell className="h-5 w-5" />
            <span className="sr-only">{labels.nav.notifications}</span>
            {/* Notification badge */}
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </Button>

        {/* User dropdown */}
        <div className="relative group">
          <Button variant="ghost" size="icon" className="rounded-full">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {userInitials}
            </div>
            <span className="sr-only">{labels.nav.userMenu}</span>
          </Button>

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-md border border-border bg-popover p-1 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
            >
              <User className="h-4 w-4" />
              {labels.nav.profile}
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
            >
              <Settings className="h-4 w-4" />
              {labels.nav.settings}
            </Link>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              {labels.common.signOut}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
