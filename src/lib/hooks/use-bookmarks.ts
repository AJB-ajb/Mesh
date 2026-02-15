import useSWR from "swr";

import type { MyInterest } from "@/lib/hooks/use-interests";

interface BookmarksResponse {
  myInterests: MyInterest[];
}

export function useBookmarks() {
  const { data, error, isLoading, mutate } = useSWR<BookmarksResponse>(
    "/api/matches/interests",
  );

  return {
    bookmarks: data?.myInterests ?? [],
    error,
    isLoading,
    mutate,
  };
}
