/**
 * POST /api/embeddings/process
 *
 * Processes pending embedding generation in batches.
 * Protected by EMBEDDINGS_API_KEY via withAuth cron mode.
 *
 * 1. Queries profiles WHERE needs_embedding = true (LIMIT 50)
 * 2. Generates embeddings in batch via OpenAI
 * 3. Updates records with embeddings and marks needs_embedding = false
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  generateEmbeddingsBatch,
  composeProfileText,
} from "@/lib/ai/embeddings";
import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";

const BATCH_LIMIT = 50;
const MAX_RETRIES = 2;

import { deriveSkillNames } from "@/lib/skills/derive";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JoinSkillRow = { skill_nodes: any };

interface ProfileRow {
  user_id: string;
  bio: string | null;
  interests: string[] | null;
  headline: string | null;
  profile_skills?: JoinSkillRow[] | null;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars",
    );
  }

  return createSupabaseClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      // Exponential backoff: 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  // TypeScript needs this — loop always returns or throws above
  throw new Error("Unreachable");
}

export const POST = withAuth(
  { authMode: "cron", cronSecretEnv: "EMBEDDINGS_API_KEY" },
  async () => {
    // Use service-role client for RLS bypass (ctx.supabase is cookie-based)
    const supabase = createServiceClient();

    // Fetch pending profiles with join table skills
    const { data: pendingProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        "user_id, bio, interests, headline, profile_skills(skill_nodes(name))",
      )
      .eq("needs_embedding", true)
      .limit(BATCH_LIMIT);

    if (profilesError) {
      return apiError(
        "INTERNAL",
        `Failed to fetch profiles: ${profilesError.message}`,
      );
    }

    const profiles = (pendingProfiles ?? []) as ProfileRow[];

    if (profiles.length === 0) {
      return apiSuccess({
        processed: { profiles: 0 },
        errors: [],
      });
    }

    // Compose texts for all items
    const profileTexts: { index: number; userId: string; text: string }[] = [];
    const skippedProfiles: string[] = [];

    for (const profile of profiles) {
      const text = composeProfileText(
        profile.bio,
        deriveSkillNames(profile.profile_skills),
        profile.interests,
        profile.headline,
      );
      if (text.trim()) {
        profileTexts.push({
          index: profileTexts.length,
          userId: profile.user_id,
          text,
        });
      } else {
        skippedProfiles.push(profile.user_id);
      }
    }

    const allTexts = profileTexts.map((p) => p.text);

    const errors: string[] = [];
    let allEmbeddings: number[][] = [];

    if (allTexts.length > 0) {
      try {
        allEmbeddings = await withRetry(() =>
          generateEmbeddingsBatch(allTexts),
        );
      } catch (error) {
        console.error("Embedding generation failed:", error);
        return apiError("INTERNAL", "Embedding generation failed");
      }
    }

    const now = new Date().toISOString();
    let processedProfiles = 0;

    // Update profiles
    for (let i = 0; i < profileTexts.length; i++) {
      const { userId } = profileTexts[i];
      const embedding = allEmbeddings[i];

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          embedding,
          needs_embedding: false,
          embedding_generated_at: now,
        })
        .eq("user_id", userId);

      if (updateError) {
        errors.push(`Profile ${userId}: ${updateError.message}`);
      } else {
        processedProfiles++;
      }
    }

    // Mark skipped items as not needing embedding (no content to embed)
    for (const userId of skippedProfiles) {
      await supabase
        .from("profiles")
        .update({ needs_embedding: false })
        .eq("user_id", userId);
    }

    return apiSuccess({
      processed: { profiles: processedProfiles },
      skipped: {
        profiles: skippedProfiles.length,
      },
      errors,
    });
  },
);
