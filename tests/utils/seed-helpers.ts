/**
 * Seed Helpers
 * API-first seeding for test data (fast setup, no UI).
 *
 * Uses standalone Supabase client (not Next.js server client)
 * so it works in Playwright's Node.js context.
 */

import { APIRequestContext } from "@playwright/test";
import { supabaseAdmin } from "./supabase";
import type { TestUser } from "../factories/user-factory";
import type { TestProfile } from "../factories/profile-factory";
import type { TestPosting } from "../factories/posting-factory";
import type { TestMatch } from "../factories/match-factory";

/**
 * Seed a user via Supabase Admin API (auto-confirms email)
 */
export async function seedUser(
  userData: TestUser,
  options: { persona?: string } = {},
): Promise<{ userId: string; user: TestUser }> {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SECRET_KEY required for seedUser");
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      full_name: userData.full_name,
      persona: options.persona ?? "developer",
    },
  });

  if (error) {
    throw new Error(`Failed to seed user: ${error.message}`);
  }

  return { userId: data.user.id, user: userData };
}

/**
 * Seed a profile directly into the database
 */
export async function seedProfile(profileData: TestProfile): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SECRET_KEY required for seedProfile");
  }

  const { error } = await supabaseAdmin.from("profiles").upsert(profileData, {
    onConflict: "user_id",
  });

  if (error) {
    throw new Error(`Failed to seed profile: ${error.message}`);
  }
}

/**
 * Seed a posting directly into the database
 */
export async function seedPostingDirect(
  postingData: Partial<TestPosting> & { creator_id: string; title: string },
): Promise<TestPosting> {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SECRET_KEY required for seedPostingDirect");
  }

  const { data, error } = await supabaseAdmin
    .from("postings")
    .insert(postingData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to seed posting: ${error.message}`);
  }

  return data;
}

/**
 * Seed a posting via API (requires authenticated request context)
 */
export async function seedPosting(
  request: APIRequestContext,
  postingData: TestPosting,
): Promise<TestPosting> {
  const response = await request.post("/api/postings", {
    data: postingData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed posting: ${response.statusText()}`);
  }

  return await response.json();
}

/**
 * Seed multiple postings
 */
export async function seedPostings(
  request: APIRequestContext,
  postings: TestPosting[],
): Promise<TestPosting[]> {
  return Promise.all(postings.map((p) => seedPosting(request, p)));
}

/**
 * Seed a match directly into the database
 */
export async function seedMatch(
  matchData: Partial<TestMatch> & {
    posting_id: string;
    user_id: string;
  },
): Promise<TestMatch> {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SECRET_KEY required for seedMatch");
  }

  const { data, error } = await supabaseAdmin
    .from("matches")
    .insert(matchData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to seed match: ${error.message}`);
  }

  return data;
}

/**
 * Clean up test data by deleting a user (cascading deletes handle the rest)
 */
export async function cleanupTestData(userId: string): Promise<void> {
  if (!supabaseAdmin) {
    console.warn("No SUPABASE_SECRET_KEY — skipping cleanup");
    return;
  }

  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (err) {
    console.warn(`Failed to cleanup user ${userId}:`, err);
  }
}
