/**
 * Bot runner — entry point for the reactive bot system.
 *
 * Starts all persona bots, connects them to Supabase Realtime, and keeps
 * the process alive. Bots react to messages and cards in their Spaces.
 *
 * Usage: pnpm tsx scripts/bots/index.ts
 *
 * Flags:
 *   --persona=Name   Run only the named persona (e.g. --persona=Marcus)
 *   --dry-run        Log decisions without sending messages or votes
 *
 * Requires:
 *   - Bot users seeded (run `pnpm tsx scripts/bots/seed.ts` first)
 *   - .env with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *     NEXT_PUBLIC_APP_URL, TEST_USER_PASSWORD, GEMINI_API_KEY
 */

import { config } from "dotenv";
import { PERSONAS } from "./personas";
import { Bot } from "./bot";

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const PASSWORD = process.env.TEST_USER_PASSWORD!;

if (!SUPABASE_URL || !SUPABASE_KEY || !PASSWORD) {
  console.error(
    "Missing env vars. Need: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, TEST_USER_PASSWORD",
  );
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "WARNING: GEMINI_API_KEY not set. Bots will react to cards but won't generate text replies.",
  );
}

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const personaFilter = args
  .find((a) => a.startsWith("--persona="))
  ?.split("=")[1]
  ?.toLowerCase();

const selectedPersonas = personaFilter
  ? PERSONAS.filter((p) => p.name.toLowerCase().includes(personaFilter))
  : PERSONAS;

if (selectedPersonas.length === 0) {
  console.error(`No persona matching "${personaFilter}"`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main() {
  console.log("Mesh Bot Runner");
  console.log("================\n");
  console.log(`App URL:    ${APP_URL}`);
  console.log(`Supabase:   ${SUPABASE_URL}`);
  console.log(`Personas:   ${selectedPersonas.map((p) => p.name).join(", ")}`);
  console.log(
    `Gemini:     ${process.env.GEMINI_API_KEY ? "configured" : "NOT SET"}`,
  );
  console.log();

  const bots: Bot[] = [];

  for (const persona of selectedPersonas) {
    const bot = new Bot(persona, APP_URL, SUPABASE_URL, SUPABASE_KEY, PASSWORD);
    try {
      await bot.start();
      bots.push(bot);
    } catch (err) {
      console.error(`Failed to start ${persona.name}:`, err);
    }
  }

  if (bots.length === 0) {
    console.error("No bots started. Run seed.ts first?");
    process.exit(1);
  }

  console.log(
    `\n${bots.length} bots online. Listening for events... (Ctrl+C to stop)\n`,
  );

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    await Promise.all(bots.map((b) => b.stop()));
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("Bot runner failed:", err);
  process.exit(1);
});
