"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FolderKanban, Loader2, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSearch } from "@/lib/hooks/use-search";
import type { SearchResult } from "@/lib/hooks/use-search";

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { results, isLoading } = useSearch(debouncedQuery);

  // Debounce the query
  useEffect(() => {
    if (!query.trim()) {
      queueMicrotask(() => setDebouncedQuery(""));
      return;
    }
    const timeoutId = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Reset selected index when results change
  useEffect(() => {
    queueMicrotask(() => setSelectedIndex(0));
  }, [results.length]);

  // Handle selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.type === "posting") {
        router.push(`/postings/${result.id}`);
      } else {
        router.push(`/profile`);
      }
      setIsOpen(false);
      setQuery("");
    },
    [router],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    },
    [results, selectedIndex, handleSelect],
  );

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, results.length]);

  return (
    <div className="relative flex-1 max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search postings, profiles... (⌘K)"
          className="pl-9 pr-9 bg-muted/50"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query || results.length > 0) && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 && query ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : results.length > 0 ? (
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
                          onClick={() => handleSelect(result)}
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
                                    result.status === "open"
                                      ? "default"
                                      : "secondary"
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
                          onClick={() => handleSelect(result)}
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
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Start typing to search...
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">
                ↑↓
              </kbd>{" "}
              to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">
                Enter
              </kbd>{" "}
              to select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">
                Esc
              </kbd>{" "}
              to close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
