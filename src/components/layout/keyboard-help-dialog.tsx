"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { labels } from "@/lib/labels";

interface KeyboardHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground min-w-6">
      {children}
    </kbd>
  );
}

export function KeyboardHelpDialog({
  open,
  onOpenChange,
}: KeyboardHelpDialogProps) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setIsMac(navigator.platform.startsWith("Mac")));
  }, []);

  const mod = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    { keys: [mod, "K"], description: labels.a11y.shortcuts.openSearch },
    { keys: ["?"], description: labels.a11y.shortcuts.showHelp },
    { keys: ["Esc"], description: labels.a11y.shortcuts.escape },
    { keys: ["↑", "↓"], description: labels.a11y.shortcuts.arrowKeys },
    { keys: ["Enter"], description: labels.a11y.shortcuts.enter },
    { keys: ["Tab"], description: labels.a11y.shortcuts.tab },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {labels.commandPalette.keyboardShortcutsTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {labels.commandPalette.keyboardShortcutsTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
