/**
 * Standalone script for processing pending embeddings.
 * Can be run via cron or manually for backfill:
 *
 *   pnpm tsx scripts/process-embeddings.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY
 *
 * Options:
 *   --all    Process ALL records with NULL embeddings (backfill mode)
 *   --limit  Max records per batch (default: 50)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY",
  );
}
if (!openaiKey) {
  throw new Error("Missing required env var: OPENAI_API_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536;

function composeProfileText(
  bio: string | null,
  skills: string[] | null,
  interests: string[] | null,
  headline: string | null,
): string {
  const parts: string[] = [];
  if (headline) parts.push(`Headline: ${headline}`);
  if (bio) parts.push(`About: ${bio}`);
  if (skills && skills.length > 0) parts.push(`Skills: ${skills.join(", ")}`);
  if (interests && interests.length > 0)
    parts.push(`Interests: ${interests.join(", ")}`);
  return parts.join("\n\n");
}

function composePostingText(
  title: string,
  description: string,
  skills: string[] | null,
): string {
  const parts: string[] = [];
  parts.push(`Title: ${title}`);
  parts.push(`Description: ${description}`);
  if (skills && skills.length > 0)
    parts.push(`Required Skills: ${skills.join(", ")}`);
  return parts.join("\n\n");
}

async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.trim()),
      dimensions: EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} ${JSON.stringify(err)}`,
    );
  }

  const data = await response.json();
  const sorted = [...data.data].sort(
    (a: { index: number }, b: { index: number }) => a.index - b.index,
  );
  return sorted.map((item: { embedding: number[] }) => item.embedding);
}

async function processEmbeddings(backfill: boolean, batchLimit: number) {
  console.log(
    `Mode: ${backfill ? "backfill (all NULL embeddings)" : "queue (needs_embedding = true)"}`,
  );
  console.log(`Batch limit: ${batchLimit}`);

  let totalProfiles = 0;
  let totalPostings = 0;
  let totalErrors = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch profiles
    let profileQuery = supabase
      .from("profiles")
      .select("user_id, bio, skills, interests, headline")
      .limit(batchLimit);

    if (backfill) {
      profileQuery = profileQuery.is("embedding", null);
    } else {
      profileQuery = profileQuery.eq("needs_embedding", true);
    }

    const { data: profiles, error: pErr } = await profileQuery;
    if (pErr) {
      console.error("Error fetching profiles:", pErr.message);
      break;
    }

    // Fetch postings
    let postingQuery = supabase
      .from("postings")
      .select("id, title, description, skills")
      .limit(batchLimit);

    if (backfill) {
      postingQuery = postingQuery.is("embedding", null);
    } else {
      postingQuery = postingQuery.eq("needs_embedding", true);
    }

    const { data: postings, error: postErr } = await postingQuery;
    if (postErr) {
      console.error("Error fetching postings:", postErr.message);
      break;
    }

    const profileRows = profiles ?? [];
    const postingRows = postings ?? [];

    if (profileRows.length === 0 && postingRows.length === 0) {
      hasMore = false;
      break;
    }

    // Compose texts
    const profileTexts: { userId: string; text: string }[] = [];
    const postingTexts: { postingId: string; text: string }[] = [];

    for (const p of profileRows) {
      const text = composeProfileText(p.bio, p.skills, p.interests, p.headline);
      if (text.trim()) {
        profileTexts.push({ userId: p.user_id, text });
      }
    }

    for (const p of postingRows) {
      const text = composePostingText(p.title, p.description, p.skills);
      if (text.trim()) {
        postingTexts.push({ postingId: p.id, text });
      }
    }

    const allTexts = [
      ...profileTexts.map((p) => p.text),
      ...postingTexts.map((p) => p.text),
    ];

    if (allTexts.length === 0) {
      hasMore = false;
      break;
    }

    console.log(
      `Processing batch: ${profileTexts.length} profiles, ${postingTexts.length} postings`,
    );

    try {
      const embeddings = await generateBatchEmbeddings(allTexts);
      const profileEmbeddings = embeddings.slice(0, profileTexts.length);
      const postingEmbeddings = embeddings.slice(profileTexts.length);
      const now = new Date().toISOString();

      for (let i = 0; i < profileTexts.length; i++) {
        const { error } = await supabase
          .from("profiles")
          .update({
            embedding: profileEmbeddings[i],
            needs_embedding: false,
            embedding_generated_at: now,
          })
          .eq("user_id", profileTexts[i].userId);

        if (error) {
          console.error(
            `  Profile ${profileTexts[i].userId}: ${error.message}`,
          );
          totalErrors++;
        } else {
          totalProfiles++;
        }
      }

      for (let i = 0; i < postingTexts.length; i++) {
        const { error } = await supabase
          .from("postings")
          .update({
            embedding: postingEmbeddings[i],
            needs_embedding: false,
            embedding_generated_at: now,
          })
          .eq("id", postingTexts[i].postingId);

        if (error) {
          console.error(
            `  Posting ${postingTexts[i].postingId}: ${error.message}`,
          );
          totalErrors++;
        } else {
          totalPostings++;
        }
      }
    } catch (error) {
      console.error("Batch embedding generation failed:", error);
      totalErrors += allTexts.length;
      hasMore = false;
    }

    // If we got fewer than the limit, we're done
    if (profileRows.length < batchLimit && postingRows.length < batchLimit) {
      hasMore = false;
    }
  }

  console.log("\nDone!");
  console.log(`  Profiles processed: ${totalProfiles}`);
  console.log(`  Postings processed: ${totalPostings}`);
  console.log(`  Errors: ${totalErrors}`);
}

// Parse CLI args
const args = process.argv.slice(2);
const backfill = args.includes("--all");
const limitIdx = args.indexOf("--limit");
const batchLimit =
  limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) || 50 : 50;

processEmbeddings(backfill, batchLimit).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
