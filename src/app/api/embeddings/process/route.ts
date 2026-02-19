/**
 * POST /api/embeddings/process
 *
 * Processes pending embedding generation in batches.
 * Protected by EMBEDDINGS_API_KEY or SUPABASE_SECRET_KEY header check.
 *
 * 1. Queries profiles/postings WHERE needs_embedding = true (LIMIT 50 each)
 * 2. Generates embeddings in batch via OpenAI
 * 3. Updates records with embeddings and marks needs_embedding = false
 */

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  generateEmbeddingsBatch,
  composeProfileText,
  composePostingText,
} from "@/lib/ai/embeddings";
import { apiError } from "@/lib/errors";

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

interface PostingRow {
  id: string;
  title: string;
  description: string;
  posting_skills?: JoinSkillRow[] | null;
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

function verifyAuth(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const embeddingsKey = process.env.EMBEDDINGS_API_KEY;

  if (embeddingsKey && token === embeddingsKey) return true;
  if (secretKey && token === secretKey) return true;

  return false;
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

export async function POST(req: Request) {
  // Allow internal calls (fire-and-forget from save flows) without auth
  // by checking for a special header, or require API key for external calls
  const isInternalCall = req.headers.get("x-internal-call") === "true";
  if (!isInternalCall && !verifyAuth(req)) {
    return apiError("UNAUTHORIZED", "Invalid or missing API key", 401);
  }

  try {
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

    // Fetch pending postings with join table skills
    const { data: pendingPostings, error: postingsError } = await supabase
      .from("postings")
      .select(
        "id, title, description, posting_skills(skill_nodes(name))",
      )
      .eq("needs_embedding", true)
      .limit(BATCH_LIMIT);

    if (postingsError) {
      return apiError(
        "INTERNAL",
        `Failed to fetch postings: ${postingsError.message}`,
      );
    }

    const profiles = (pendingProfiles ?? []) as ProfileRow[];
    const postings = (pendingPostings ?? []) as PostingRow[];

    if (profiles.length === 0 && postings.length === 0) {
      return NextResponse.json({
        processed: { profiles: 0, postings: 0 },
        errors: [],
      });
    }

    // Compose texts for all items
    const profileTexts: { index: number; userId: string; text: string }[] = [];
    const postingTexts: { index: number; postingId: string; text: string }[] =
      [];
    const skippedProfiles: string[] = [];
    const skippedPostings: string[] = [];

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

    for (const posting of postings) {
      const text = composePostingText(
        posting.title,
        posting.description,
        deriveSkillNames(posting.posting_skills),
      );
      if (text.trim()) {
        postingTexts.push({
          index: postingTexts.length,
          postingId: posting.id,
          text,
        });
      } else {
        skippedPostings.push(posting.id);
      }
    }

    // Combine all texts into a single batch call
    const allTexts = [
      ...profileTexts.map((p) => p.text),
      ...postingTexts.map((p) => p.text),
    ];

    const errors: string[] = [];
    let allEmbeddings: number[][] = [];

    if (allTexts.length > 0) {
      try {
        allEmbeddings = await withRetry(() =>
          generateEmbeddingsBatch(allTexts),
        );
      } catch (error) {
        return apiError(
          "INTERNAL",
          `Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Split embeddings back to profiles and postings
    const profileEmbeddings = allEmbeddings.slice(0, profileTexts.length);
    const postingEmbeddings = allEmbeddings.slice(profileTexts.length);

    const now = new Date().toISOString();
    let processedProfiles = 0;
    let processedPostings = 0;

    // Update profiles
    for (let i = 0; i < profileTexts.length; i++) {
      const { userId } = profileTexts[i];
      const embedding = profileEmbeddings[i];

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

    // Update postings
    for (let i = 0; i < postingTexts.length; i++) {
      const { postingId } = postingTexts[i];
      const embedding = postingEmbeddings[i];

      const { error: updateError } = await supabase
        .from("postings")
        .update({
          embedding,
          needs_embedding: false,
          embedding_generated_at: now,
        })
        .eq("id", postingId);

      if (updateError) {
        errors.push(`Posting ${postingId}: ${updateError.message}`);
      } else {
        processedPostings++;
      }
    }

    // Mark skipped items as not needing embedding (no content to embed)
    for (const userId of skippedProfiles) {
      await supabase
        .from("profiles")
        .update({ needs_embedding: false })
        .eq("user_id", userId);
    }
    for (const postingId of skippedPostings) {
      await supabase
        .from("postings")
        .update({ needs_embedding: false })
        .eq("id", postingId);
    }

    return NextResponse.json({
      processed: { profiles: processedProfiles, postings: processedPostings },
      skipped: {
        profiles: skippedProfiles.length,
        postings: skippedPostings.length,
      },
      errors,
    });
  } catch (error) {
    console.error("Embedding processing error:", error);
    return apiError(
      "INTERNAL",
      error instanceof Error ? error.message : "Internal server error",
    );
  }
}
