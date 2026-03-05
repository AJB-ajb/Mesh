"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDateAgo } from "@/lib/format";
import type { ChildPosting } from "@/lib/hooks/use-child-postings";

// ---------------------------------------------------------------------------
// Status color helper (matches unified-posting-card)
// ---------------------------------------------------------------------------

function getStatusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "filled":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "closed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChildPostingCard({ posting }: { posting: ChildPosting }) {
  const creatorName = posting.profiles?.full_name ?? "Unknown";
  const displayText = posting.title || posting.description;

  return (
    <Link href={`/postings/${posting.id}`} className="block">
      <div className="border-b px-4 py-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{creatorName}</span>
          <span>&middot;</span>
          <span>{formatDateAgo(posting.created_at)}</span>
        </div>

        <p className="mt-1 text-sm line-clamp-2">{displayText}</p>

        <div className="mt-1.5">
          <Badge
            variant="secondary"
            className={`text-xs ${getStatusColor(posting.status)}`}
          >
            {posting.status}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
