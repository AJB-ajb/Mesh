import useSWR from "swr";

interface InterestPosting {
  id: string;
  title: string;
  description: string;
  skills: string[];
  category: string | null;
  mode: string;
  status: string;
  creator_id: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    user_id: string;
  };
}

interface InterestProfile {
  full_name: string | null;
  user_id: string;
  headline: string | null;
  skills: string[] | null;
}

export interface MyInterest {
  id: string;
  posting_id: string;
  similarity_score: number;
  status: string;
  created_at: string;
  postings: InterestPosting;
}

export interface InterestReceived {
  id: string;
  posting_id: string;
  user_id: string;
  similarity_score: number;
  status: string;
  created_at: string;
  postings: InterestPosting;
  profiles: InterestProfile;
}

interface InterestsResponse {
  myInterests: MyInterest[];
  interestsReceived: InterestReceived[];
}

export function useInterests() {
  const { data, error, isLoading, mutate } = useSWR<InterestsResponse>(
    "/api/matches/interests",
  );

  return {
    myInterests: data?.myInterests ?? [],
    interestsReceived: data?.interestsReceived ?? [],
    error,
    isLoading,
    mutate,
  };
}
