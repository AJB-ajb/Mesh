import { useCallback, useMemo } from "react";
import useSWR from "swr";

interface BookmarksApiResponse {
  postingIds: string[];
}

export function useBookmarks() {
  const { data, error, isLoading, mutate } =
    useSWR<BookmarksApiResponse>("/api/bookmarks");

  const bookmarkedIds = useMemo(
    () => new Set(data?.postingIds ?? []),
    [data?.postingIds],
  );

  const toggleBookmark = useCallback(
    async (postingId: string) => {
      // Optimistic update
      const wasBookmarked = bookmarkedIds.has(postingId);
      const optimisticIds = wasBookmarked
        ? data!.postingIds.filter((id) => id !== postingId)
        : [...(data?.postingIds ?? []), postingId];

      await mutate(
        async () => {
          const res = await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ posting_id: postingId }),
          });
          if (!res.ok) throw new Error("Failed to toggle bookmark");
          // Return updated list after server confirms
          const listRes = await fetch("/api/bookmarks");
          if (!listRes.ok) throw new Error("Failed to fetch bookmarks");
          return listRes.json();
        },
        {
          optimisticData: { postingIds: optimisticIds },
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [data, bookmarkedIds, mutate],
  );

  return {
    bookmarkedIds,
    toggleBookmark,
    error,
    isLoading,
    mutate,
  };
}
