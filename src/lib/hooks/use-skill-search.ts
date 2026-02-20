"use client";

import { useState, useCallback, useRef } from "react";
import type { SkillNode, BrowseNode } from "@/lib/types/skill";

type SkillSearchState = {
  results: SkillNode[];
  browseNodes: BrowseNode[];
  browsePath: string[];
  browseParentId: string | null;
  isSearching: boolean;
  isBrowsing: boolean;
  isNormalizing: boolean;
  error: string | null;
};

export function useSkillSearch() {
  const [state, setState] = useState<SkillSearchState>({
    results: [],
    browseNodes: [],
    browsePath: [],
    browseParentId: null,
    isSearching: false,
    isBrowsing: false,
    isNormalizing: false,
    error: null,
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const search = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setState((prev) => ({
        ...prev,
        results: [],
        isSearching: false,
        error: null,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSearching: true, error: null }));

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/skills/search?q=${encodeURIComponent(query)}&limit=10`,
        );
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Search failed");
        }
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          results: data.results ?? [],
          isSearching: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          results: [],
          isSearching: false,
          error: err instanceof Error ? err.message : "Search failed",
        }));
      }
    }, 150);
  }, []);

  const browseChildren = useCallback(async (parentId: string | null) => {
    setState((prev) => ({ ...prev, isBrowsing: true, error: null }));
    try {
      const url = parentId
        ? `/api/skills/children?parentId=${parentId}`
        : `/api/skills/children`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Browse failed");
      }
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        browseNodes: data.children ?? [],
        browsePath: data.parentPath ?? [],
        browseParentId: parentId,
        isBrowsing: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        browseNodes: [],
        isBrowsing: false,
        error: err instanceof Error ? err.message : "Browse failed",
      }));
    }
  }, []);

  const normalize = useCallback(
    async (
      skill: string,
    ): Promise<{ node: SkillNode; created: boolean } | null> => {
      setState((prev) => ({ ...prev, isNormalizing: true, error: null }));
      try {
        const res = await fetch("/api/skills/normalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Normalization failed");
        }
        const data = await res.json();
        setState((prev) => ({ ...prev, isNormalizing: false }));
        return data;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isNormalizing: false,
          error: err instanceof Error ? err.message : "Normalization failed",
        }));
        return null;
      }
    },
    [],
  );

  const clearResults = useCallback(() => {
    setState((prev) => ({ ...prev, results: [], error: null }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    search,
    browseChildren,
    normalize,
    clearResults,
    clearError,
  };
}
