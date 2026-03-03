"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { labels } from "@/lib/labels";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";

export function CreatePostingFab() {
  const pathname = usePathname();
  const { keyboardVisible } = useMobileKeyboard();

  // Hide when on create page, posting detail pages, or when keyboard is up
  if (
    pathname === "/postings/new" ||
    pathname.startsWith("/postings/") ||
    keyboardVisible
  )
    return null;

  return (
    <Link
      href="/postings/new"
      className="fixed right-4 bottom-24 z-40 md:hidden flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors pb-[env(safe-area-inset-bottom,0px)]"
      aria-label={labels.common.newPosting}
    >
      <Plus className="size-6" />
    </Link>
  );
}
