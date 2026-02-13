/**
 * Migrate ALL data from production Supabase project to dev project.
 *
 * Fetches all rows from production (profiles, postings, matches,
 * friend_asks, friendships) and inserts them into the dev project.
 * Also recreates associated auth users in the dev project.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-test-data.ts [--dry-run]
 *
 * Requires both .env (dev) and .env.production (prod) to be present.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";

// --- Load env files ---

// Dev project from .env
config();
const devUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const devSecretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Production project from .env.production
const prodEnv: Record<string, string> = {};
try {
  const raw = readFileSync(resolve(process.cwd(), ".env.production"), "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    prodEnv[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
} catch {
  console.error("Could not read .env.production");
  process.exit(1);
}

const prodUrl = prodEnv.NEXT_PUBLIC_SUPABASE_URL;
const prodSecretKey =
  prodEnv.SUPABASE_SECRET_KEY ?? prodEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!devUrl || !devSecretKey) {
  console.error("Missing dev Supabase credentials in .env");
  process.exit(1);
}
if (!prodUrl || !prodSecretKey) {
  console.error("Missing prod Supabase credentials in .env.production");
  process.exit(1);
}
if (prodUrl === devUrl) {
  console.error("Production and dev URLs are the same — aborting");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

const prod = createClient(prodUrl, prodSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const dev = createClient(devUrl, devSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Helpers ---

async function fetchAll<T>(
  client: SupabaseClient,
  table: string,
): Promise<T[]> {
  const { data, error } = await client.from(table).select("*");
  if (error) {
    // Table may not exist — not an error for optional tables
    if (error.message.includes("does not exist") || error.code === "42P01") {
      console.log(`   Table '${table}' does not exist — skipping`);
      return [];
    }
    console.error(`  Error fetching ${table}:`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

async function upsertRows(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<number> {
  if (rows.length === 0) return 0;
  if (dryRun) return rows.length;

  // Try upserting; if a column doesn't exist in dev, strip it and retry
  let currentRows = rows;
  for (let attempt = 0; attempt < 10; attempt++) {
    const { error } = await client
      .from(table)
      .upsert(currentRows, { onConflict, ignoreDuplicates: false });

    if (!error) return currentRows.length;

    // Check if error is about a missing column
    const colMatch = error.message.match(
      /Could not find the '(\w+)' column of '\w+' in the schema cache/,
    );
    if (colMatch) {
      const badCol = colMatch[1];
      console.log(`  Stripping column '${badCol}' (not in dev schema)`);
      currentRows = currentRows.map((row) => {
        const copy = { ...row };
        delete copy[badCol];
        return copy;
      });
      continue;
    }

    console.error(`  Error upserting ${table}:`, error.message);
    return 0;
  }

  console.error(`  Error upserting ${table}: too many missing columns`);
  return 0;
}

// --- Main ---

async function main() {
  console.log(
    dryRun
      ? "\n=== DRY RUN ==="
      : "\n=== MIGRATING ALL DATA FROM PROD → DEV ===",
  );
  console.log(`  Prod: ${prodUrl}`);
  console.log(`  Dev:  ${devUrl}\n`);

  // 1. Fetch ALL auth users from production
  console.log("1. Fetching all auth users from production...");
  const { data: prodUsersData } = await prod.auth.admin.listUsers({
    perPage: 1000,
  });
  const prodUsers = prodUsersData?.users ?? [];
  console.log(`   Found ${prodUsers.length} auth users`);

  // 2. Fetch ALL profiles from production
  console.log("2. Fetching all profiles from production...");
  const allProfiles = await fetchAll<Record<string, unknown>>(prod, "profiles");
  console.log(`   Found ${allProfiles.length} profiles`);

  // 3. Fetch ALL postings from production
  console.log("3. Fetching all postings from production...");
  const allPostings = await fetchAll<Record<string, unknown>>(prod, "postings");
  console.log(`   Found ${allPostings.length} postings`);

  // 4. Fetch ALL matches
  console.log("4. Fetching all matches from production...");
  const allMatches = await fetchAll<Record<string, unknown>>(prod, "matches");
  console.log(`   Found ${allMatches.length} matches`);

  // 5. Fetch ALL friend_asks
  console.log("5. Fetching all friend_asks from production...");
  const allFriendAsks = await fetchAll<Record<string, unknown>>(
    prod,
    "friend_asks",
  );
  console.log(`   Found ${allFriendAsks.length} friend_asks`);

  // 6. Fetch ALL friendships
  console.log("6. Fetching all friendships from production...");
  const allFriendships = await fetchAll<Record<string, unknown>>(
    prod,
    "friendships",
  );
  console.log(`   Found ${allFriendships.length} friendships`);

  // 7. Recreate auth users in dev project
  console.log("\n7. Recreating auth users in dev project...");
  let usersCreated = 0;
  let usersSkipped = 0;

  for (const prodUser of prodUsers) {
    if (dryRun) {
      console.log(`   [dry-run] Would create user: ${prodUser.email}`);
      usersCreated++;
      continue;
    }

    const { error: createErr } = await dev.auth.admin.createUser({
      email: prodUser.email ?? undefined,
      email_confirm: true,
      user_metadata: prodUser.user_metadata,
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        console.log(`   User ${prodUser.email} already exists in dev`);
        usersSkipped++;
      } else {
        console.log(
          `   Warning creating user ${prodUser.email}: ${createErr.message}`,
        );
        usersSkipped++;
      }
    } else {
      console.log(`   Created user: ${prodUser.email}`);
      usersCreated++;
    }
  }
  console.log(
    `   Users: ${usersCreated} created, ${usersSkipped} skipped/existing`,
  );

  // 8. Build user ID mapping (prod_id -> dev_id) by email
  console.log("\n8. Mapping prod user IDs to dev user IDs...");
  const userIdMap = new Map<string, string>(); // prod_id -> dev_id

  const { data: devUsersData } = await dev.auth.admin.listUsers({
    perPage: 1000,
  });
  const devUsers = devUsersData?.users ?? [];
  const devUsersByEmail = new Map(devUsers.map((u) => [u.email, u.id]));

  for (const prodUser of prodUsers) {
    if (!prodUser.email) continue;
    const devId = devUsersByEmail.get(prodUser.email);
    if (devId) {
      userIdMap.set(prodUser.id, devId);
      const same = prodUser.id === devId;
      console.log(
        `   ${prodUser.email}: ${prodUser.id} -> ${devId}${same ? " (same)" : " (different)"}`,
      );
    } else {
      console.log(`   ${prodUser.email}: no dev user found — skipping`);
    }
  }

  // Helper to remap user IDs
  function remapUserId(prodId: string): string | null {
    return userIdMap.get(prodId) ?? null;
  }

  // 9. Insert profiles into dev
  console.log("\n9. Inserting profiles into dev...");
  const remappedProfiles = allProfiles
    .map((p) => {
      const devUserId = remapUserId(p.user_id as string);
      if (!devUserId) return null;
      const copy = { ...p, user_id: devUserId };
      delete copy.is_test_data;
      return copy;
    })
    .filter(Boolean) as Record<string, unknown>[];

  const profileCount = await upsertRows(
    dev,
    "profiles",
    remappedProfiles,
    "user_id",
  );
  console.log(`   Upserted ${profileCount} profiles`);

  // 10. Insert postings into dev
  console.log("10. Inserting postings into dev...");
  const remappedPostings = allPostings
    .map((p) => {
      const devCreatorId = remapUserId(p.creator_id as string);
      if (!devCreatorId) return null;
      const copy = { ...p, creator_id: devCreatorId };
      delete copy.is_test_data;
      return copy;
    })
    .filter(Boolean) as Record<string, unknown>[];

  // Build posting ID mapping (identity — we keep the same posting UUIDs)
  const postingIdMap = new Map<string, string>();
  for (const p of remappedPostings) {
    postingIdMap.set(p.id as string, p.id as string);
  }

  const postingCount = await upsertRows(
    dev,
    "postings",
    remappedPostings,
    "id",
  );
  console.log(`   Upserted ${postingCount} postings`);

  // 11. Insert matches into dev
  console.log("11. Inserting matches into dev...");
  const remappedMatches = allMatches
    .map((m) => {
      const devUserId = remapUserId(m.user_id as string);
      const devPostingId = postingIdMap.get(m.posting_id as string);
      if (!devUserId || !devPostingId) return null;
      return { ...m, user_id: devUserId, posting_id: devPostingId };
    })
    .filter(Boolean) as Record<string, unknown>[];

  const matchCount = await upsertRows(dev, "matches", remappedMatches, "id");
  console.log(`   Upserted ${matchCount} matches`);

  // 12. Insert friend_asks into dev
  console.log("12. Inserting friend_asks into dev...");
  const remappedFriendAsks = allFriendAsks
    .map((fa) => {
      const devCreatorId = remapUserId(fa.creator_id as string);
      const devPostingId = postingIdMap.get(fa.posting_id as string);
      if (!devCreatorId || !devPostingId) return null;
      const orderedList = (fa.ordered_friend_list as string[]) ?? [];
      const remappedList = orderedList
        .map((id) => remapUserId(id))
        .filter(Boolean) as string[];
      return {
        ...fa,
        creator_id: devCreatorId,
        posting_id: devPostingId,
        ordered_friend_list: remappedList,
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  const faCount = await upsertRows(
    dev,
    "friend_asks",
    remappedFriendAsks,
    "id",
  );
  console.log(`   Upserted ${faCount} friend_asks`);

  // 13. Insert friendships into dev
  console.log("13. Inserting friendships into dev...");
  const remappedFriendships = allFriendships
    .map((f) => {
      const devUserId = remapUserId(f.user_id as string);
      const devFriendId = remapUserId(f.friend_id as string);
      if (!devUserId || !devFriendId) return null;
      return { ...f, user_id: devUserId, friend_id: devFriendId };
    })
    .filter(Boolean) as Record<string, unknown>[];

  const fsCount = await upsertRows(
    dev,
    "friendships",
    remappedFriendships,
    "id",
  );
  console.log(`   Upserted ${fsCount} friendships`);

  // Summary
  console.log("\n=== SUMMARY ===");
  console.log(
    `  Auth users:  ${usersCreated} created, ${usersSkipped} existing`,
  );
  console.log(`  Profiles:    ${profileCount}`);
  console.log(`  Postings:    ${postingCount}`);
  console.log(`  Matches:     ${matchCount}`);
  console.log(`  Friend asks: ${faCount}`);
  console.log(`  Friendships: ${fsCount}`);
  if (dryRun) {
    console.log("\n  (Dry run — no data was actually written)");
  } else {
    console.log("\n  Done! All production data migrated to dev project.");
    console.log("  Production DB can now be wiped for real user data.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
