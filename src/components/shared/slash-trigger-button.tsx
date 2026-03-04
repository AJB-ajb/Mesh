"use client";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";

interface SlashTriggerButtonProps {
  onClick: () => void;
}

export function SlashTriggerButton({ onClick }: SlashTriggerButtonProps) {
  const { keyboardVisible, keyboardHeight } = useMobileKeyboard();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="md:hidden fixed right-4 z-40 size-10 rounded-full shadow-lg"
      style={{
        bottom: keyboardVisible ? keyboardHeight + 8 : 80,
      }}
      onClick={onClick}
      aria-label={labels.mobileCommandSheet.triggerLabel}
    >
      <span className="text-lg font-bold">/</span>
    </Button>
  );
}
