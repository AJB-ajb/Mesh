"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Bell, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import { ACTIVITY_ITEMS } from "./mock-data";

const tabs = [
  { href: "/spaces", icon: MessageSquare, label: "Spaces" },
  { href: "/spaces/activity", icon: Bell, label: "Activity" },
  { href: "/spaces/profile", icon: User, label: "Profile" },
] as const;

export function SpaceBottomBar() {
  const pathname = usePathname();
  const { keyboardVisible } = useMobileKeyboard();

  if (keyboardVisible) return null;

  const activityCount = ACTIVITY_ITEMS.length;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Space navigation"
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/spaces"
              ? pathname === "/spaces" ||
                (pathname.startsWith("/spaces/") &&
                  !pathname.startsWith("/spaces/activity") &&
                  !pathname.startsWith("/spaces/profile"))
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <tab.icon className="size-5" />
              {tab.label === "Activity" && activityCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                  {activityCount}
                </span>
              )}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
