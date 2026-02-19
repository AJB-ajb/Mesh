"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Bookmark,
  Inbox,
  Plus,
  Menu,
  X,
  User,
  Settings,
  ChevronLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { NavItem } from "./nav-item";

const navigation = [
  { href: "/dashboard", icon: LayoutDashboard, label: labels.nav.dashboard },
  { href: "/postings", icon: FolderKanban, label: labels.nav.postings },
  { href: "/matches", icon: Users, label: labels.nav.matches },
  { href: "/bookmarks", icon: Bookmark, label: labels.nav.bookmarks },
  { href: "/inbox", icon: Inbox, label: labels.nav.inbox },
];

const secondaryNavigation = [
  { href: "/profile", icon: User, label: labels.nav.profile },
  { href: "/settings", icon: Settings, label: labels.nav.settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Only access localStorage on client side
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Save collapsed state
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
        <span className="sr-only">{labels.nav.toggleMenu}</span>
      </Button>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar",
          "transition-all duration-300 ease-in-out",
          "md:sticky md:top-0 md:h-screen md:overflow-y-auto",
          // Desktop: collapsed or expanded
          isCollapsed ? "md:w-16" : "md:w-64",
          // Mobile: slide in/out
          isMobileOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full md:translate-x-0",
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
            <Logo href="/dashboard" />
          </div>
          {/* Collapse toggle - desktop only */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleCollapse}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
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
              <Plus className="h-4 w-4 flex-shrink-0" />
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
        >
          {navigation.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={isCollapsed}
            />
          ))}
        </nav>

        {/* Secondary Navigation */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <nav
            className="space-y-1"
            aria-label={labels.nav.secondaryNavigation}
          >
            {secondaryNavigation.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                collapsed={isCollapsed}
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
          <p className="text-xs text-muted-foreground">
            {labels.nav.copyright}
          </p>
        </div>
      </aside>
    </>
  );
}
