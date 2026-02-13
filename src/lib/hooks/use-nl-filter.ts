import { useState, useCallback } from "react";
import type { PostingFilters } from "@/lib/types/filters";
import {
  filtersToFilterPills,
  removeFilterByKey,
} from "@/lib/filters/format-filters";
import type { FilterPill } from "@/lib/filters/format-filters";

export interface UseNlFilterOptions {
  onCategoryChange?: (category: string | undefined) => void;
  onModeChange?: (mode: string | undefined) => void;
}

export interface UseNlFilterReturn {
  nlQuery: string;
  setNlQuery: (query: string) => void;
  nlFilters: PostingFilters;
  nlFilterPills: FilterPill[];
  hasActiveFilters: boolean;
  isTranslating: boolean;
  handleNlSearch: (query: string) => Promise<void>;
  handleRemoveNlFilter: (key: string) => void;
  clearFilters: () => void;
}

export function useNlFilter(
  options: UseNlFilterOptions = {},
): UseNlFilterReturn {
  const { onCategoryChange, onModeChange } = options;

  const [nlQuery, setNlQuery] = useState("");
  const [nlFilters, setNlFilters] = useState<PostingFilters>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const nlFilterPills = filtersToFilterPills(nlFilters);
  const hasActiveFilters = nlFilterPills.length > 0;

  const handleNlSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setNlFilters({});
        return;
      }

      setIsTranslating(true);
      try {
        const response = await fetch("/api/filters/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to parse filters");
        }

        const data = await response.json();
        if (data.filters) {
          setNlFilters(data.filters);
          if (data.filters.category) {
            onCategoryChange?.(data.filters.category);
          }
          if (data.filters.mode) {
            onModeChange?.(data.filters.mode);
          }
        }
      } catch {
        // Fall back silently on failure
      } finally {
        setIsTranslating(false);
      }
    },
    [onCategoryChange, onModeChange],
  );

  const handleRemoveNlFilter = useCallback(
    (key: string) => {
      const updated = removeFilterByKey(nlFilters, key);
      setNlFilters(updated);
      if (key === "category") {
        onCategoryChange?.(undefined);
      }
      if (key === "mode") {
        onModeChange?.(undefined);
      }
    },
    [nlFilters, onCategoryChange, onModeChange],
  );

  const clearFilters = useCallback(() => {
    setNlFilters({});
    setNlQuery("");
    onCategoryChange?.(undefined);
    onModeChange?.(undefined);
  }, [onCategoryChange, onModeChange]);

  return {
    nlQuery,
    setNlQuery,
    nlFilters,
    nlFilterPills,
    hasActiveFilters,
    isTranslating,
    handleNlSearch,
    handleRemoveNlFilter,
    clearFilters,
  };
}
