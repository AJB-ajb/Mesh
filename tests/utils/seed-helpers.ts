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
import type { TestProject } from "../factories/project-factory";
import type { TestMatch } from "../factories/match-factory";

/**
 * Seed a user via Supabase Admin API (auto-confirms email)
 */
export async function seedUser(
  userData: TestUser,
  options: { persona?: string } = {},
): Promise<{ userId: string; user: TestUser }> {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for seedUser");
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
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for seedProfile");
  }

  const { error } = await supabaseAdmin.from("profiles").upsert(profileData, {
    onConflict: "user_id",
  });

  if (error) {
    throw new Error(`Failed to seed profile: ${error.message}`);
  }
}

/**
 * Seed a project directly into the database
 */
export async function seedProjectDirect(
  projectData: Partial<TestProject> & { creator_id: string; title: string },
): Promise<TestProject> {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for seedProjectDirect");
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert(projectData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to seed project: ${error.message}`);
  }

  return data;
}

/**
 * Seed a project via API (requires authenticated request context)
 */
export async function seedProject(
  request: APIRequestContext,
  projectData: TestProject,
): Promise<TestProject> {
  const response = await request.post("/api/projects", {
    data: projectData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed project: ${response.statusText()}`);
  }

  return await response.json();
}

/**
 * Seed multiple projects
 */
export async function seedProjects(
  request: APIRequestContext,
  projects: TestProject[],
): Promise<TestProject[]> {
  return Promise.all(projects.map((p) => seedProject(request, p)));
}

/**
 * Seed a match directly into the database
 */
export async function seedMatch(
  matchData: Partial<TestMatch> & {
    project_id: string;
    user_id: string;
  },
): Promise<TestMatch> {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for seedMatch");
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
    console.warn("No SUPABASE_SERVICE_ROLE_KEY — skipping cleanup");
    return;
  }

  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (err) {
    console.warn(`Failed to cleanup user ${userId}:`, err);
  }
}
