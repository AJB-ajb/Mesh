"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostingCardInline } from "./posting-card-inline";
import type { CardData } from "./mock-data";

const FILTERS = ["All", "Newest", "Best Match", "Filling Up"] as const;

type LargeSpaceViewProps = {
  postings: CardData[];
};

export function LargeSpaceView({ postings }: LargeSpaceViewProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = search
    ? postings.filter(
        (p) =>
          p.postingTitle?.toLowerCase().includes(search.toLowerCase()) ||
          p.postingText?.toLowerCase().includes(search.toLowerCase()),
      )
    : postings;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search postings..."
            className="w-full rounded-lg border border-input bg-muted/50 pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors min-h-[32px]",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Posting list */}
      <div className="space-y-3 p-4">
        {filtered.map((posting, i) => (
          <PostingCardInline key={i} card={posting} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No postings found
          </p>
        )}
      </div>
    </div>
  );
}
