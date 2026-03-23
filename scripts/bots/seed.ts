/**
 * Seed bot personas into the dev Supabase project.
 *
 * Creates auth users, profiles, availability slots, fake calendar busy blocks,
 * and shared Spaces with the human user. Idempotent — safe to re-run.
 *
 * Usage: pnpm tsx scripts/bots/seed.ts [--user=email ...]
 *
 * Specify --user=email for each human user to add to bot spaces.
 * Can be repeated: --user=a@example.com --user=b@example.com
 *
 * Requires .env with:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 *   NEXT_PUBLIC_APP_URL, TEST_USER_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { PERSONAS } from "./personas";

config();

// ---------------------------------------------------------------------------
// Safety: only run against dev
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
if (
  APP_URL.includes("jirgkhjdxahfsgqxprhh") ||
  APP_URL.includes("meshit.app")
) {
  console.error(
    "REFUSED: NEXT_PUBLIC_APP_URL points to production. Bots are dev-only.",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;
if (!url || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const password = process.env.TEST_USER_PASSWORD;
if (!password) {
  console.error("Missing TEST_USER_PASSWORD in .env");
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findUserByEmail(email: string) {
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 100, page });
    if (!data?.users?.length) return null;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 100) return null;
    page++;
  }
}

/** Generate fake busy blocks for next 14 days based on persona availability */
function generateBusyBlocks(
  availability: Record<string, { start: string; end: string }[]>,
): { start_time: string; end_time: string }[] {
  const blocks: { start_time: string; end_time: string }[] = [];
  const now = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  for (let d = 0; d < 14; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dayName = dayNames[date.getDay()];
    const windows = availability[dayName];
    if (!windows?.length) continue;

    // Add 1-3 random meetings during available hours
    const meetingCount = 1 + Math.floor(Math.random() * 3);
    for (let m = 0; m < meetingCount; m++) {
      const window = windows[0];
      const [startH] = window.start.split(":").map(Number);
      const [endH] = window.end.split(":").map(Number);
      if (endH - startH < 2) continue;

      const meetingStart =
        startH + Math.floor(Math.random() * (endH - startH - 1));
      const duration = 30 + Math.floor(Math.random() * 3) * 30; // 30, 60, or 90 min

      const start = new Date(date);
      start.setUTCHours(meetingStart, Math.random() > 0.5 ? 30 : 0, 0, 0);
      const end = new Date(start.getTime() + duration * 60 * 1000);

      blocks.push({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });
    }
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Seed users & profiles
// ---------------------------------------------------------------------------

interface SeededBot {
  userId: string;
  email: string;
  name: string;
}

async function seedBotUsers(): Promise<SeededBot[]> {
  const bots: SeededBot[] = [];

  for (const persona of PERSONAS) {
    console.log(`  Creating ${persona.name} (${persona.email})...`);

    // Create or find auth user
    let userId: string;
    const { data, error } = await admin.auth.admin.createUser({
      email: persona.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: persona.name },
    });

    if (error) {
      const existing = await findUserByEmail(persona.email);
      if (!existing) {
        console.error(`    FAILED: ${error.message}`);
        continue;
      }
      userId = existing.id;
      // Ensure password is current
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      console.log(`    Already exists (${userId})`);
    } else {
      userId = data.user.id;
      console.log(`    Created (${userId})`);
    }

    // Upsert profile (profiles table has no email column)
    await admin.from("profiles").upsert(
      {
        user_id: userId,
        full_name: persona.name,
        source_text: persona.profileText,
        availability_slots: persona.availability,
        timezone: persona.timezone,
        needs_embedding: true,
      },
      { onConflict: "user_id" },
    );

    // Seed calendar busy blocks (delete old ones first)
    await admin.from("calendar_busy_blocks").delete().eq("profile_id", userId);

    const blocks = generateBusyBlocks(persona.availability);
    if (blocks.length > 0) {
      await admin.from("calendar_busy_blocks").insert(
        blocks.map((b) => ({
          profile_id: userId,
          start_time: b.start_time,
          end_time: b.end_time,
          summary: "Busy",
          calendar_id: "bot-generated",
        })),
      );
      console.log(`    Seeded ${blocks.length} calendar busy blocks`);
    }

    bots.push({ userId, email: persona.email, name: persona.name });
  }

  return bots;
}

// ---------------------------------------------------------------------------
// Seed spaces
// ---------------------------------------------------------------------------

interface SpaceSeed {
  name: string;
  description: string;
  /** Persona emails to include (human user is always added) */
  botEmails: string[];
}

const SPACES_TO_SEED: SpaceSeed[] = [
  {
    name: "Friday Dinner",
    description: "Weekly dinner planning — who's in, when, where?",
    botEmails: [
      "bot-priya@mesh.dev",
      "bot-marcus@mesh.dev",
      "bot-lena@mesh.dev",
    ],
  },
  {
    name: "Hackathon Team",
    description:
      "XHacks 2026 team — building an accessibility checker. Need to split work and schedule standups.",
    botEmails: [
      "bot-marcus@mesh.dev",
      "bot-kai@mesh.dev",
      "bot-sara@mesh.dev",
      "bot-lena@mesh.dev",
    ],
  },
  {
    name: "Spanish Practice",
    description:
      "Weekly Spanish conversation practice. B1-B2 level, cafe meetups.",
    botEmails: ["bot-lena@mesh.dev", "bot-sara@mesh.dev"],
  },
  {
    name: "Quick Sync",
    description: "DM-style space for quick calls and check-ins.",
    botEmails: ["bot-kai@mesh.dev"],
  },
];

async function seedSpaces(bots: SeededBot[], humanUserIds: string[]) {
  const botByEmail = new Map(bots.map((b) => [b.email, b]));
  const primaryHuman = humanUserIds[0];

  for (const spaceSeed of SPACES_TO_SEED) {
    console.log(`  Creating space "${spaceSeed.name}"...`);

    // Check if space already exists (by name, for idempotency)
    const { data: existing } = await admin
      .from("spaces")
      .select("id")
      .eq("name", spaceSeed.name)
      .maybeSingle();

    let spaceId: string;
    if (existing) {
      spaceId = existing.id;
      console.log(`    Already exists (${spaceId})`);
    } else {
      const { data: space, error } = await admin
        .from("spaces")
        .insert({
          name: spaceSeed.name,
          created_by: primaryHuman,
          settings: {
            posting_only: false,
          },
        })
        .select("id")
        .single();

      if (error) {
        console.error(`    FAILED: ${error.message}`);
        continue;
      }
      spaceId = space.id;
      console.log(`    Created (${spaceId})`);
    }

    // Update state_text
    await admin
      .from("spaces")
      .update({ state_text: spaceSeed.description })
      .eq("id", spaceId);

    // Add members (all human users + bots)
    const memberIds = [...humanUserIds];
    for (const email of spaceSeed.botEmails) {
      const bot = botByEmail.get(email);
      if (bot) memberIds.push(bot.userId);
    }

    for (const userId of memberIds) {
      const { error: memberError } = await admin.from("space_members").upsert(
        {
          space_id: spaceId,
          user_id: userId,
          role: humanUserIds.includes(userId) ? "admin" : "member",
        },
        { onConflict: "space_id,user_id" },
      );

      if (memberError && !memberError.message.includes("duplicate")) {
        console.error(
          `    Member add failed (${userId}): ${memberError.message}`,
        );
      }
    }

    const botNames = spaceSeed.botEmails
      .map((e) => botByEmail.get(e)?.name)
      .filter(Boolean);
    const humanCount = humanUserIds.length;
    console.log(
      `    Members: ${humanCount} human${humanCount > 1 ? "s" : ""} + ${botNames.join(", ")}`,
    );

    // Seed a welcome message from the first bot
    const firstBot = botByEmail.get(spaceSeed.botEmails[0]);
    if (firstBot && !existing) {
      const welcomeMessages: Record<string, string> = {
        "Friday Dinner": "hey! so are we doing dinner this friday?",
        "Hackathon Team":
          "ok team, we got 48 hours — let's figure out who's doing what",
        "Spanish Practice": "hola! should we do tuesday again this week?",
        "Quick Sync": "hey, got a few minutes for a quick call sometime?",
      };
      const msg = welcomeMessages[spaceSeed.name];
      if (msg) {
        await admin.from("space_messages").insert({
          space_id: spaceId,
          sender_id: firstBot.userId,
          type: "message",
          content: msg,
        });
        console.log(`    Seeded welcome message from ${firstBot.name}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Bot Persona Seeder");
  console.log("==================\n");

  // Parse --user=email flags (can be specified multiple times)
  const args = process.argv.slice(2);
  const userEmails = args
    .filter((a) => a.startsWith("--user="))
    .map((a) => a.split("=")[1]);

  // Resolve human users
  const humanUsers: { id: string; email: string }[] = [];

  if (userEmails.length === 0) {
    console.error(
      "Usage: pnpm tsx scripts/bots/seed.ts --user=you@example.com [--user=other@example.com ...]",
    );
    process.exit(1);
  }

  for (const email of userEmails) {
    const found = await findUserByEmail(email);
    if (!found) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }
    humanUsers.push({ id: found.id, email: email });
  }

  for (const hu of humanUsers) {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", hu.id)
      .maybeSingle();

    console.log(`Human user: ${profile?.full_name ?? hu.email} (${hu.id})`);
  }
  console.log();

  console.log("1. Seeding bot users & profiles...\n");
  const bots = await seedBotUsers();
  console.log(`\n   ${bots.length} bots ready.\n`);

  console.log("2. Seeding spaces...\n");
  await seedSpaces(
    bots,
    humanUsers.map((u) => u.id),
  );

  console.log("\nDone! Bot users can sign in with TEST_USER_PASSWORD.");
  console.log("Run `pnpm tsx scripts/bots/index.ts` to start the bots.\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
