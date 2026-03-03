"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { labels } from "@/lib/labels";
import { useSearch } from "@/lib/hooks/use-search";
import type { SearchResult } from "@/lib/hooks/use-search";
import { createActions } from "@/lib/command-palette/actions";
import type { PaletteAction } from "@/lib/command-palette/actions";
import { filterActions } from "@/lib/command-palette/filter-actions";
import { GlobalSearchResults } from "./global-search-results";

const THEMES = ["light", "dark", "dusk"] as const;

function useIsMac() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    queueMicrotask(() => setIsMac(navigator.platform.startsWith("Mac")));
  }, []);
  return isMac;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    queueMicrotask(() => setIsMobile(mql.matches));
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function GlobalSearch() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isMac = useIsMac();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { results, isLoading } = useSearch(debouncedQuery);

  // Build action registry
  const cycleTheme = useCallback(() => {
    const currentIndex = THEMES.indexOf(theme as (typeof THEMES)[number]);
    const next = THEMES[(currentIndex + 1) % THEMES.length];
    setTheme(next);
  }, [theme, setTheme]);

  const allActions = useMemo(
    () => createActions({ router, cycleTheme }),
    [router, cycleTheme],
  );

  const filteredActions = useMemo(
    () => filterActions(allActions, query),
    [allActions, query],
  );

  const combinedLength = filteredActions.length + results.length;

  // Debounce the query
  useEffect(() => {
    if (!query.trim()) {
      queueMicrotask(() => setDebouncedQuery(""));
      return;
    }
    const timeoutId = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Reset selected index when results or actions change
  useEffect(() => {
    queueMicrotask(() => setSelectedIndex(0));
  }, [results.length, filteredActions.length]);

  // Handle search result selection
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

  // Handle action execution
  const handleActionExecute = useCallback(
    (action: PaletteAction) => {
      action.execute({ router, cycleTheme });
      setIsOpen(false);
      setQuery("");
    },
    [router, cycleTheme],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, combinedLength - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Actions come first in the combined list
        if (selectedIndex < filteredActions.length) {
          handleActionExecute(filteredActions[selectedIndex]);
        } else {
          const resultIndex = selectedIndex - filteredActions.length;
          if (results[resultIndex]) {
            handleSelect(results[resultIndex]);
          }
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    },
    [
      combinedLength,
      filteredActions,
      results,
      selectedIndex,
      handleSelect,
      handleActionExecute,
    ],
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
    if (resultsRef.current && combinedLength > 0) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, combinedLength]);

  return (
    <div className="relative flex-1 max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={
            isMobile
              ? "Search postings, profiles..."
              : `Search postings, profiles... (${isMac ? "\u2318" : "Ctrl+"}K)`
          }
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
            aria-label={labels.nav.clearSearch}
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown — show when open (actions always available) */}
      {isOpen && (
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
            actions={filteredActions}
            onActionExecute={handleActionExecute}
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
