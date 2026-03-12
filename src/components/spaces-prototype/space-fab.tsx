"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";

export function SpaceFab() {
  const { keyboardVisible } = useMobileKeyboard();

  if (keyboardVisible) return null;

  return (
    <Button
      size="icon"
      className="fixed bottom-20 right-4 z-40 size-14 rounded-full shadow-lg"
      aria-label="Create new space"
    >
      <Plus className="size-6" />
    </Button>
  );
}
