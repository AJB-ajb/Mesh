"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  FolderKanban,
  Users,
  Plus,
  User,
  Settings,
  ChevronLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { useRovingIndex } from "@/lib/hooks/use-roving-index";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { NavItem } from "./nav-item";

const navigation = [
  { href: "/discover", icon: Compass, label: labels.nav.discover },
  { href: "/posts", icon: FolderKanban, label: labels.nav.posts },
  { href: "/connections", icon: Users, label: labels.nav.connections },
];

const secondaryNavigation = [
  { href: "/profile", icon: User, label: labels.nav.profile },
  { href: "/settings", icon: Settings, label: labels.nav.settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const onActivatePrimary = useCallback(
    (index: number) => {
      router.push(navigation[index].href);
    },
    [router],
  );

  const onActivateSecondary = useCallback(
    (index: number) => {
      router.push(secondaryNavigation[index].href);
    },
    [router],
  );

  const primaryRoving = useRovingIndex({
    itemCount: navigation.length,
    onActivate: onActivatePrimary,
  });

  const secondaryRoving = useRovingIndex({
    itemCount: secondaryNavigation.length,
    onActivate: onActivateSecondary,
  });

  // Save collapsed state
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  return (
    <aside
      className={cn(
        "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-sidebar-border bg-sidebar",
        "transition-all duration-300 ease-in-out",
        "md:sticky md:top-0 md:h-screen md:overflow-y-auto",
        // Desktop: collapsed or expanded
        isCollapsed ? "md:w-16" : "md:w-64",
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div
          className={cn(
            "transition-opacity duration-200",
            isCollapsed ? "md:opacity-0 md:w-0" : "opacity-100",
          )}
        >
          <Logo href="/posts" />
        </div>
        {/* Collapse toggle - desktop only */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex size-8 text-muted-foreground hover:text-foreground"
          onClick={toggleCollapse}
          aria-label={
            isCollapsed ? labels.nav.expandSidebar : labels.nav.collapseSidebar
          }
        >
          <ChevronLeft
            className={cn(
              "size-4 transition-transform duration-300",
              isCollapsed && "rotate-180",
            )}
          />
        </Button>
      </div>

      {/* New Posting button */}
      <div className="px-3 py-4">
        <Button
          className={cn(
            "w-full justify-start gap-2 transition-all duration-200",
            isCollapsed && "md:justify-center md:px-2",
          )}
          asChild
        >
          <Link href="/postings/new">
            <Plus className="size-4 flex-shrink-0" />
            <span
              className={cn(
                "transition-opacity duration-200",
                isCollapsed && "md:hidden",
              )}
            >
              {labels.common.newPosting}
            </span>
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-1 px-3"
        role="navigation"
        aria-label={labels.nav.mainNavigation}
        onKeyDown={primaryRoving.getContainerProps().onKeyDown}
      >
        {navigation.map((item, i) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            collapsed={isCollapsed}
            tabIndex={primaryRoving.getItemProps(i).tabIndex}
            onFocus={primaryRoving.getItemProps(i).onFocus}
          />
        ))}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <nav
          className="space-y-1"
          aria-label={labels.nav.secondaryNavigation}
          onKeyDown={secondaryRoving.getContainerProps().onKeyDown}
        >
          {secondaryNavigation.map((item, i) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={isCollapsed}
              tabIndex={secondaryRoving.getItemProps(i).tabIndex}
              onFocus={secondaryRoving.getItemProps(i).onFocus}
            />
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "border-t border-sidebar-border p-4 transition-opacity duration-200",
          isCollapsed && "md:opacity-0",
        )}
      >
        <p className="text-xs text-muted-foreground">{labels.nav.copyright}</p>
      </div>
    </aside>
  );
}
