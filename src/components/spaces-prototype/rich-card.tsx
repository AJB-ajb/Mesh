"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RichCardProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  resolved?: boolean;
  className?: string;
};

export function RichCard({
  icon,
  title,
  children,
  resolved,
  className,
}: RichCardProps) {
  return (
    <Card
      className={cn(
        "mx-2 border transition-colors",
        resolved
          ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/20"
          : "border-border",
        className,
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{title}</span>
          {resolved && (
            <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">
              Confirmed
            </span>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
