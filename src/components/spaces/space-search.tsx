"use client";

import { useState, useRef, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { labels } from "@/lib/labels";
import { useSpaceSearch } from "@/lib/hooks/use-space-search";

interface SpaceSearchProps {
  spaceId: string;
  onClose: () => void;
}

export function SpaceSearch({ spaceId, onClose }: SpaceSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading } = useSpaceSearch(spaceId, debouncedQuery);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="border-b border-border bg-background px-4 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.spaces.search.placeholder}
          className="h-8 text-sm"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onClose}
          aria-label={labels.spaces.search.close}
        >
          <X className="size-4" />
        </Button>
      </div>

      {query.trim().length >= 2 && (
        <div className="max-h-60 overflow-y-auto space-y-1">
          {isLoading && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {labels.spaces.search.noResults}
            </p>
          )}

          {results.map((r) => (
            <button
              key={r.message_id}
              type="button"
              className="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
              onClick={onClose}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {r.sender_name ?? "Unknown"}
                </span>
                <RelativeTime
                  date={r.created_at}
                  formatter={formatTimeAgoShort}
                />
              </div>
              <p className="text-sm truncate">{r.content}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
