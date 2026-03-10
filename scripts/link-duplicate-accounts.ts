/**
 * Find and optionally merge duplicate auth accounts.
 *
 * Usage:
 *   # Dry run — list duplicates only
 *   pnpm tsx scripts/link-duplicate-accounts.ts
 *
 *   # Actually merge duplicates (keep the older account, delete the newer one)
 *   pnpm tsx scripts/link-duplicate-accounts.ts --merge
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY",
  );
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const shouldMerge = process.argv.includes("--merge");

async function getAllUsers(): Promise<User[]> {
  const allUsers: User[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    allUsers.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  return allUsers;
}

async function findDuplicates() {
  console.log("Fetching all auth users...");
  const users = await getAllUsers();
  console.log(`Found ${users.length} total auth users.\n`);

  // Group by email
  const byEmail = new Map<string, User[]>();
  for (const user of users) {
    if (!user.email) continue;
    const email = user.email.toLowerCase();
    const existing = byEmail.get(email) || [];
    existing.push(user);
    byEmail.set(email, existing);
  }

  // Filter to duplicates
  const duplicates = [...byEmail.entries()].filter(
    ([, users]) => users.length > 1,
  );

  if (duplicates.length === 0) {
    console.log("No duplicate accounts found.");
    return;
  }

  console.log(`Found ${duplicates.length} email(s) with duplicate accounts:\n`);

  for (const [email, dupeUsers] of duplicates) {
    console.log(`Email: ${email}`);
    // Sort by creation date (oldest first = primary)
    const sorted = dupeUsers.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const primary = sorted[0];
    const duplicateUsers = sorted.slice(1);

    for (const u of sorted) {
      const providers =
        u.identities?.map((id) => id.provider).join(", ") || "none";
      const isPrimary = u.id === primary.id;
      console.log(
        `  ${isPrimary ? "[PRIMARY]" : "[DUPLICATE]"} id=${u.id} providers=${providers} created=${u.created_at}`,
      );
    }

    if (shouldMerge) {
      for (const dupe of duplicateUsers) {
        console.log(
          `\n  Merging: keeping ${primary.id}, deleting ${dupe.id}...`,
        );

        // Check if the duplicate has any data in profiles/postings
        const { data: profile } = await admin
          .from("profiles")
          .select("user_id")
          .eq("user_id", dupe.id)
          .single();

        const { data: postings } = await admin
          .from("postings")
          .select("id")
          .eq("creator_id", dupe.id)
          .limit(1);

        if (profile) {
          console.log(
            `  WARNING: Duplicate ${dupe.id} has a profile. Reassigning to primary...`,
          );
          // Delete the duplicate profile (primary should keep theirs)
          // If primary doesn't have a profile, move the duplicate's profile instead
          const { data: primaryProfile } = await admin
            .from("profiles")
            .select("user_id")
            .eq("user_id", primary.id)
            .single();

          if (!primaryProfile) {
            // Move the duplicate's profile to the primary user
            await admin
              .from("profiles")
              .update({ user_id: primary.id })
              .eq("user_id", dupe.id);
            console.log(`  Moved profile from ${dupe.id} to ${primary.id}`);
          } else {
            console.log(
              `  Primary already has a profile. Duplicate profile will be orphaned on user deletion.`,
            );
          }
        }

        if (postings && postings.length > 0) {
          console.log(
            `  Reassigning ${postings.length}+ posting(s) from ${dupe.id} to ${primary.id}...`,
          );
          await admin
            .from("postings")
            .update({ creator_id: primary.id })
            .eq("creator_id", dupe.id);
        }

        // Delete the duplicate auth user
        const { error: deleteError } = await admin.auth.admin.deleteUser(
          dupe.id,
        );
        if (deleteError) {
          console.error(`  ERROR deleting ${dupe.id}: ${deleteError.message}`);
        } else {
          console.log(`  Deleted duplicate user ${dupe.id}`);
        }
      }
    }

    console.log("");
  }

  if (!shouldMerge) {
    console.log(
      "Run with --merge to delete duplicate accounts and reassign their data to the primary (oldest) account.",
    );
  }
}

findDuplicates().catch(console.error);
