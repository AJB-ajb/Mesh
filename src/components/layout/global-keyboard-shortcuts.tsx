"use client";

import { useState, useEffect, useCallback } from "react";
import { KeyboardHelpDialog } from "./keyboard-help-dialog";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function GlobalKeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only trigger when not inside an editable element
    if (isEditableTarget(e.target)) return;

    if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setHelpOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return <KeyboardHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />;
}
