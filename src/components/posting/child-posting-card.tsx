"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDateAgo } from "@/lib/format";
import { RelativeTime } from "@/components/ui/relative-time";
import { getStatusColor } from "@/lib/posting/styles";
import type { ChildPosting } from "@/lib/hooks/use-child-postings";

export function ChildPostingCard({ posting }: { posting: ChildPosting }) {
  const creatorName = posting.profiles?.full_name ?? "Unknown";
  const displayText = posting.title || posting.description;

  return (
    <Link href={`/postings/${posting.id}`} className="block">
      <div className="border-b px-4 py-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{creatorName}</span>
          <span>&middot;</span>
          <RelativeTime date={posting.created_at} formatter={formatDateAgo} />
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
