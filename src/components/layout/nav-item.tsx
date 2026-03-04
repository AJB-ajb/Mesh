"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  collapsed?: boolean;
  tabIndex?: 0 | -1;
  onFocus?: () => void;
}

export function NavItem({
  href,
  icon: Icon,
  label,
  badge,
  collapsed,
  tabIndex,
  onFocus,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      tabIndex={tabIndex}
      onFocus={onFocus}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "md:justify-center md:px-2",
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span
        className={cn(
          "flex-1 transition-opacity duration-200",
          collapsed && "md:hidden",
        )}
      >
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground transition-all duration-200",
            collapsed &&
              "md:absolute md:top-0 md:right-0 md:h-4 md:min-w-4 md:text-[0.625rem]",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
