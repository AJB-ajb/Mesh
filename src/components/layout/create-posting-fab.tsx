"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, PenLine, MessageSquarePlus } from "lucide-react";

import { labels } from "@/lib/labels";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
import { openFeedbackSheet } from "@/components/feedback/use-feedback-sheet";

export function CreatePostingFab() {
  const pathname = usePathname();
  const { keyboardVisible } = useMobileKeyboard();
  const [expanded, setExpanded] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close when navigating (derived state pattern)
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (expanded) setExpanded(false);
  }

  // Close on outside tap
  useEffect(() => {
    if (!expanded) return;
    function handleTap(e: PointerEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("pointerdown", handleTap);
    return () => document.removeEventListener("pointerdown", handleTap);
  }, [expanded]);

  const handleFeedback = useCallback(() => {
    setExpanded(false);
    openFeedbackSheet();
  }, []);

  // Hide when on create page, posting detail pages, or when keyboard is up
  if (
    pathname === "/postings/new" ||
    pathname.startsWith("/postings/") ||
    pathname === "/profile" ||
    keyboardVisible
  )
    return null;

  return (
    <div ref={fabRef} className="fixed right-4 bottom-24 z-40 md:hidden">
      {/* Backdrop overlay when expanded */}
      {expanded && (
        <div className="fixed inset-0 bg-black/20 -z-10" aria-hidden />
      )}

      {/* Speed-dial options */}
      <div
        className={`absolute bottom-16 right-0 flex flex-col items-end gap-3 transition-all duration-200 ${
          expanded
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Feedback option */}
        <button
          type="button"
          onClick={handleFeedback}
          className="flex items-center gap-2 group"
          aria-label={labels.feedback.buttonAriaLabel}
        >
          <span className="bg-popover text-popover-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap">
            {labels.feedback.sheetTitle}
          </span>
          <span className="flex items-center justify-center size-11 rounded-full bg-orange-500 text-white shadow-lg">
            <MessageSquarePlus className="size-5" />
          </span>
        </button>

        {/* Create posting option */}
        <Link
          href="/postings/new"
          onClick={() => setExpanded(false)}
          className="flex items-center gap-2 group"
          aria-label={labels.common.newPosting}
        >
          <span className="bg-popover text-popover-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap">
            {labels.common.newPosting}
          </span>
          <span className="flex items-center justify-center size-11 rounded-full bg-primary text-primary-foreground shadow-lg">
            <PenLine className="size-5" />
          </span>
        </Link>
      </div>

      {/* Main FAB button */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 ${
          expanded ? "rotate-45" : ""
        }`}
        aria-expanded={expanded}
        aria-label={expanded ? labels.common.close : labels.common.newPosting}
      >
        <Plus className="size-6" />
      </button>
    </div>
  );
}
