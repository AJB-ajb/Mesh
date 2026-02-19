import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { deriveSkillNames } from "@/lib/skills/derive";

type SearchResult = {
  id: string;
  type: "posting" | "profile";
  title: string;
  subtitle: string;
  skills: string[];
  status?: string;
};

async function fetchSearchResults(key: string): Promise<SearchResult[]> {
  const query = key.replace("search/", "");
  if (!query.trim()) return [];

  const supabase = createClient();
  const searchTerm = `%${query.toLowerCase()}%`;

  const [{ data: postings }, { data: profiles }] = await Promise.all([
    supabase
      .from("postings")
      .select(
        "id, title, description, status, posting_skills(skill_nodes(name))",
      )
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5),
    supabase
      .from("profiles")
      .select(
        "user_id, full_name, headline, profile_skills(skill_nodes(name))",
      )
      .or(`full_name.ilike.${searchTerm},headline.ilike.${searchTerm}`)
      .limit(5),
  ]);

  const postingResults: SearchResult[] = (postings || []).map((p) => ({
    id: p.id,
    type: "posting",
    title: p.title,
    subtitle:
      p.description?.slice(0, 80) + (p.description?.length > 80 ? "..." : "") ||
      "",
    skills: deriveSkillNames(p.posting_skills),
    status: p.status,
  }));

  const profileResults: SearchResult[] = (profiles || []).map((p) => ({
    id: p.user_id,
    type: "profile",
    title: p.full_name || "Unknown",
    subtitle: p.headline || "",
    skills: deriveSkillNames(p.profile_skills),
  }));

  return [...postingResults, ...profileResults];
}

export function useSearch(query: string) {
  const { data, error, isLoading } = useSWR(
    query.trim() ? `search/${query}` : null,
    fetchSearchResults,
    { dedupingInterval: 300, keepPreviousData: true },
  );

  return {
    results: data ?? [],
    error,
    isLoading,
  };
}

export type { SearchResult };
