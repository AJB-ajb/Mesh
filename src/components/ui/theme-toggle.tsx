"use client";

import * as React from "react";
import { Moon, Sun, Sunset } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";

const THEMES = ["light", "dark", "dusk"] as const;

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("relative", className)}
        disabled
      >
        <Sun className="h-5 w-5" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const effective = (resolvedTheme ?? "light") as (typeof THEMES)[number];
  const currentIndex = THEMES.indexOf(effective);
  const next = THEMES[(currentIndex + 1) % THEMES.length];

  const themeNames: Record<string, string> = {
    light: labels.common.themeLight,
    dark: labels.common.themeDark,
    dusk: labels.common.themeDusk,
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={() => setTheme(next)}
      title={themeNames[effective] ?? effective}
    >
      {effective === "light" && <Sun className="h-5 w-5 animate-fade-in" />}
      {effective === "dark" && <Moon className="h-5 w-5 animate-fade-in" />}
      {effective === "dusk" && <Sunset className="h-5 w-5 animate-fade-in" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
