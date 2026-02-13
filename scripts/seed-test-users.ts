/**
 * Seed test user accounts via Supabase Admin API.
 * Creates accounts with email_confirm: true so they can log in immediately.
 *
 * Usage: pnpm tsx scripts/seed-test-users.ts
 *
 * Requires SUPABASE_SECRET_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config(); // Load .env

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false },
});

const password = process.env.TEST_USER_PASSWORD;
if (!password) {
  console.error("Missing TEST_USER_PASSWORD in .env");
  process.exit(1);
}

const TEST_USERS = [
  { email: "ajb60721@gmail.com", password, full_name: "Test User 1" },
  { email: "ajb60722@gmail.com", password, full_name: "Test User 2" },
];

async function findUserByEmail(email: string) {
  let page = 1;
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({
      perPage: 100,
      page,
    });
    if (!data?.users?.length) return null;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 100) return null;
    page++;
  }
}

async function ensureProfile(userId: string, fullName: string, email: string) {
  await supabase
    .from("profiles")
    .upsert(
      { user_id: userId, full_name: fullName, email },
      { onConflict: "user_id" },
    );
}

async function seedUser(user: (typeof TEST_USERS)[number]) {
  // Try to create the user
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });

  if (!error && data?.user) {
    await ensureProfile(data.user.id, user.full_name, user.email);
    console.log(`  Created: ${user.email} (id: ${data.user.id})`);
    return data.user.id;
  }

  // User likely already exists — find and update
  const existing = await findUserByEmail(user.email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      password: user.password,
    });
    await ensureProfile(existing.id, user.full_name, user.email);
    console.log(
      `  Updated: ${user.email} (id: ${existing.id}) — email confirmed, password reset`,
    );
    return existing.id;
  }

  console.error(`  Failed: ${user.email}: ${error?.message}`);
  return null;
}

async function main() {
  console.log("Seeding test users...\n");

  for (const user of TEST_USERS) {
    await seedUser(user);
  }

  console.log("\nDone. Test users can now log in with email + password.");
}

main().catch(console.error);
