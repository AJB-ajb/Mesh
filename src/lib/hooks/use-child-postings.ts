import useSWR from "swr";

type ChildPosting = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  creator_id: string;
  parent_posting_id: string;
  profiles?: {
    full_name: string | null;
    user_id: string;
  };
};

async function fetchChildPostings(key: string): Promise<ChildPosting[]> {
  const parentId = key.split("/").pop();
  const res = await fetch(`/api/postings/${parentId}/children`);
  if (!res.ok) {
    throw new Error("Failed to fetch child postings");
  }
  const data = await res.json();
  return data.children ?? [];
}

export function useChildPostings(parentPostingId: string | undefined) {
  const key = parentPostingId ? `child-postings/${parentPostingId}` : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchChildPostings);

  return {
    childPostings: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export type { ChildPosting };
