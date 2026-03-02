"use client";

import * as React from "react";
import { Moon, Sun, Sunset } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const THEMES = ["light", "dark", "dusk"] as const;

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
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

  const currentIndex = THEMES.indexOf(theme as (typeof THEMES)[number]);
  const next = THEMES[(currentIndex + 1) % THEMES.length];

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={() => setTheme(next)}
    >
      {theme === "light" && <Sun className="h-5 w-5 animate-fade-in" />}
      {theme === "dark" && <Moon className="h-5 w-5 animate-fade-in" />}
      {theme === "dusk" && <Sunset className="h-5 w-5 animate-fade-in" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
