/**
 * Match Explanation Generation
 * Uses Gemini Flash to generate 2-3 sentence explanations of why a match is good
 */

import {
  generateContentWithFallback,
  isGeminiConfigured,
} from "@/lib/ai/gemini";
import type { Profile } from "@/lib/supabase/types";
import { AI } from "@/lib/constants";

export type MatchExplanationProfile = Pick<
  Profile,
  "location_preference" | "interests" | "bio"
>;

export interface PostingData {
  title: string;
  description: string;
  skills: string[];
  category: string | null;
  estimated_time: string | null;
}

/**
 * Generates a match explanation using Gemini Flash
 * Creates a 2-3 sentence explanation of why the profile and posting are a good match
 */
export async function generateMatchExplanation(
  profile: MatchExplanationProfile,
  posting: PostingData,
  score: number,
): Promise<string> {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const scorePercent = Math.round(score * 100);

  // Build the prompt
  const prompt = `Given this user profile and posting, explain in 2-3 sentences why they are a good match. Focus on specific skill overlaps and relevant experience. Be concise and friendly.

User Profile:
- Location Preference: ${profile.location_preference ?? "Not specified"}
- Interests: ${profile.interests?.join(", ") || "Not specified"}
- Bio: ${profile.bio || "Not provided"}

Posting:
- Title: ${posting.title}
- Description: ${posting.description}
- Skills: ${posting.skills.join(", ") || "Not specified"}
- Category: ${posting.category || "Not specified"}
- Estimated Time: ${posting.estimated_time || "Not specified"}

Match Score: ${scorePercent}%

Explanation:`;

  const result = await generateContentWithFallback({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: AI.TEMPERATURE,
      topK: AI.TOP_K,
      topP: AI.TOP_P,
      maxOutputTokens: AI.MAX_OUTPUT_TOKENS,
    },
  });

  const explanation = result.response.text().trim();

  if (!explanation) {
    throw new Error("Invalid explanation response from Gemini API");
  }

  return explanation;
}

/**
 * Generates explanations for multiple matches in batch
 * Uses Promise.all for parallel processing
 */
export async function generateMatchExplanations(
  matches: Array<{
    profile: MatchExplanationProfile;
    posting: PostingData;
    score: number;
  }>,
): Promise<string[]> {
  const promises = matches.map((match) =>
    generateMatchExplanation(match.profile, match.posting, match.score).catch(
      (error) => {
        console.error("Failed to generate explanation:", error);
        return null; // Return null on error, caller can handle
      },
    ),
  );

  const results = await Promise.all(promises);
  return results.filter((r): r is string => r !== null);
}
