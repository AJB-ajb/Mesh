"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useSearch } from "@/lib/hooks/use-search";
import type { SearchResult } from "@/lib/hooks/use-search";
import { GlobalSearchResults } from "./global-search-results";

function useIsMac() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    queueMicrotask(() => setIsMac(navigator.platform.startsWith("Mac")));
  }, []);
  return isMac;
}

export function GlobalSearch() {
  const router = useRouter();
  const isMac = useIsMac();
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
          placeholder={`Search postings, profiles... (${isMac ? "\u2318" : "Ctrl+"}K)`}
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
          <GlobalSearchResults
            results={results}
            query={query}
            isLoading={isLoading}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
          />

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">
                &uarr;&darr;
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
