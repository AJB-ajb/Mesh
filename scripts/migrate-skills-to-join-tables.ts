/**
 * Batch migration script: migrate old skill columns → join tables
 *
 * For each profile with `skills[]` and empty `profile_skills`:
 *   - Normalize each skill via exact/alias match (fast, free), then LLM fallback
 *   - Insert into `profile_skills` with level from `skill_levels` jsonb
 *
 * For each posting with `skills[]` and empty `posting_skills`:
 *   - Normalize each skill
 *   - Insert into `posting_skills` with `level_min` from `skill_level_min`
 *
 * Idempotent: skip entries with existing join rows.
 *
 * Usage: pnpm tsx scripts/migrate-skills-to-join-tables.ts [--no-llm]
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeSkillString } from "../src/lib/skills/normalize";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in environment");
  process.exit(1);
}

const useLLM = !process.argv.includes("--no-llm");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrateProfiles() {
  console.log("\n--- Migrating profiles ---");

  // Fetch profiles with old skills that have no join rows
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, skills, skill_levels, profile_skills(skill_id)");

  if (error) {
    console.error("Failed to fetch profiles:", error.message);
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const profile of profiles || []) {
    const skills = (profile.skills as string[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingJoin = (profile.profile_skills as any[]) || [];

    if (skills.length === 0 || existingJoin.length > 0) {
      skipped++;
      continue;
    }

    const skillLevels = (profile.skill_levels as Record<string, number>) || {};

    for (const skill of skills) {
      try {
        const result = await normalizeSkillString(supabase, skill, { useLLM });
        if (!result) {
          console.warn(
            `  [profile ${profile.user_id}] Could not normalize: "${skill}"`,
          );
          continue;
        }

        const level =
          skillLevels[skill] ?? skillLevels[skill.toLowerCase()] ?? null;

        const { error: insertError } = await supabase
          .from("profile_skills")
          .upsert(
            {
              profile_id: profile.user_id,
              skill_id: result.nodeId,
              level,
            },
            { onConflict: "profile_id,skill_id" },
          );

        if (insertError) {
          console.error(
            `  [profile ${profile.user_id}] Insert error for "${skill}":`,
            insertError.message,
          );
          errors++;
        } else {
          console.log(
            `  [profile ${profile.user_id}] "${skill}" → ${result.name} (${result.created ? "created" : "matched"})`,
          );
        }
      } catch (err) {
        console.error(
          `  [profile ${profile.user_id}] Error normalizing "${skill}":`,
          err,
        );
        errors++;
      }
    }
    migrated++;
  }

  console.log(
    `Profiles: ${migrated} migrated, ${skipped} skipped, ${errors} errors`,
  );
}

async function migratePostings() {
  console.log("\n--- Migrating postings ---");

  const { data: postings, error } = await supabase
    .from("postings")
    .select("id, skills, skill_level_min, posting_skills(skill_id)");

  if (error) {
    console.error("Failed to fetch postings:", error.message);
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const posting of postings || []) {
    const skills = (posting.skills as string[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingJoin = (posting.posting_skills as any[]) || [];

    if (skills.length === 0 || existingJoin.length > 0) {
      skipped++;
      continue;
    }

    const levelMin = posting.skill_level_min as number | null;

    for (const skill of skills) {
      try {
        const result = await normalizeSkillString(supabase, skill, { useLLM });
        if (!result) {
          console.warn(
            `  [posting ${posting.id}] Could not normalize: "${skill}"`,
          );
          continue;
        }

        const { error: insertError } = await supabase
          .from("posting_skills")
          .upsert(
            {
              posting_id: posting.id,
              skill_id: result.nodeId,
              level_min: levelMin,
            },
            { onConflict: "posting_id,skill_id" },
          );

        if (insertError) {
          console.error(
            `  [posting ${posting.id}] Insert error for "${skill}":`,
            insertError.message,
          );
          errors++;
        } else {
          console.log(
            `  [posting ${posting.id}] "${skill}" → ${result.name} (${result.created ? "created" : "matched"})`,
          );
        }
      } catch (err) {
        console.error(
          `  [posting ${posting.id}] Error normalizing "${skill}":`,
          err,
        );
        errors++;
      }
    }
    migrated++;
  }

  console.log(
    `Postings: ${migrated} migrated, ${skipped} skipped, ${errors} errors`,
  );
}

async function main() {
  console.log(
    `Migrating skills to join tables (LLM: ${useLLM ? "enabled" : "disabled"})`,
  );
  await migrateProfiles();
  await migratePostings();
  console.log("\nDone!");
}

main().catch(console.error);
