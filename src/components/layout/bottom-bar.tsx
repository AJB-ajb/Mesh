"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, FolderKanban, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";

const tabs = [
  { href: "/discover", icon: Compass, label: labels.nav.discover },
  { href: "/posts", icon: FolderKanban, label: labels.nav.posts },
  { href: "/connections", icon: Users, label: labels.nav.connections },
] as const;

export function BottomBar() {
  const pathname = usePathname();
  const { keyboardVisible } = useMobileKeyboard();

  if (keyboardVisible) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label={labels.nav.bottomBar}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <tab.icon className="size-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
