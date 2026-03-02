"use client";

import { FolderKanban, Loader2, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/lib/hooks/use-search";

// ---------------------------------------------------------------------------
// GlobalSearchResults — result list rendering with badges/icons/nav
// ---------------------------------------------------------------------------

type GlobalSearchResultsProps = {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (result: SearchResult) => void;
};

export function GlobalSearchResults({
  results,
  query,
  isLoading,
  selectedIndex,
  onSelect,
}: GlobalSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No results found for &quot;{query}&quot;
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Start typing to search...
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {/* Postings Section */}
      {results.some((r) => r.type === "posting") && (
        <div>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
            Postings
          </div>
          {results
            .filter((r) => r.type === "posting")
            .map((result) => {
              const globalIdx = results.findIndex(
                (r) => r.id === result.id && r.type === result.type,
              );
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  data-index={globalIdx}
                  onClick={() => onSelect(result)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-accent transition-colors",
                    selectedIndex === globalIdx && "bg-accent",
                  )}
                >
                  <FolderKanban className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {result.title}
                      </span>
                      {result.status && (
                        <Badge
                          variant={
                            result.status === "open" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {result.status}
                        </Badge>
                      )}
                    </div>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    )}
                    {result.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="text-xs bg-muted px-1.5 py-0.5 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              );
            })}
        </div>
      )}

      {/* Profiles Section */}
      {results.some((r) => r.type === "profile") && (
        <div>
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
            People
          </div>
          {results
            .filter((r) => r.type === "profile")
            .map((result) => {
              const globalIdx = results.findIndex(
                (r) => r.id === result.id && r.type === result.type,
              );
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  data-index={globalIdx}
                  onClick={() => onSelect(result)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-accent transition-colors",
                    selectedIndex === globalIdx && "bg-accent",
                  )}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                    {result.title
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">
                      {result.title}
                    </span>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    )}
                    {result.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.skills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="text-xs bg-muted px-1.5 py-0.5 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
