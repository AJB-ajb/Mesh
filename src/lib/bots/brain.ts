/**
 * Bot decision engine.
 *
 * Rules-based for mechanical actions (vote, accept, claim).
 * Gemini for free-text replies (persona-flavored conversation).
 *
 * Gemini calls are rate-limited per bot to stay under budget.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BotPersona } from "./personas";

// ---------------------------------------------------------------------------
// Gemini setup (separate from app's Gemini — uses the same key but
// could use a different one via BOT_GEMINI_API_KEY if desired)
// ---------------------------------------------------------------------------

const GEMINI_KEY = process.env.BOT_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_KEY) throw new Error("No GEMINI_API_KEY for bot brain");
    genAI = new GoogleGenerativeAI(GEMINI_KEY);
  }
  return genAI;
}

/** Per-bot rate limiting: track last Gemini call time */
const lastCallTime = new Map<string, number>();
const MIN_CALL_INTERVAL_MS = 5 * 60 * 1000; // 5 min between Gemini calls per bot

function canCallGemini(botEmail: string): boolean {
  const last = lastCallTime.get(botEmail) ?? 0;
  return Date.now() - last >= MIN_CALL_INTERVAL_MS;
}

function recordGeminiCall(botEmail: string) {
  lastCallTime.set(botEmail, Date.now());
}

// ---------------------------------------------------------------------------
// Free-text reply generation
// ---------------------------------------------------------------------------

export interface MessageContext {
  senderName: string;
  content: string;
}

/**
 * Generate a persona-flavored reply to a conversation.
 * Returns null if rate-limited or Gemini fails (bots can stay silent).
 */
export async function generateReply(
  persona: BotPersona,
  recentMessages: MessageContext[],
  spaceName: string,
): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  if (!canCallGemini(persona.email)) return null;

  const conversationText = recentMessages
    .slice(-8)
    .map((m) => `${m.senderName}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are ${persona.name}, a real person using a group coordination app called Mesh.

Your personality: ${persona.style}

Your background: ${persona.profileText.replace(/\|\|hidden\|\|/g, "").trim()}

Rules:
- Write a short reply (1-2 sentences max). You're texting, not writing an essay.
- Stay in character. Match the tone described above.
- React naturally to what was said. If someone proposed a plan, respond to it.
- Do NOT mention that you're a bot or AI.
- Do NOT be overly helpful, formal, or sycophantic.
- If the conversation doesn't need your input, you can say something brief or just react.`;

  const userPrompt = `Space: "${spaceName}"

Recent messages:
${conversationText}

Write your reply as ${persona.name}:`;

  try {
    recordGeminiCall(persona.email);
    const model = getGenAI().getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 150,
      },
    });

    const text = result.response.text().trim();
    // Strip any accidental "Name:" prefix the model might add
    const cleaned = text.replace(new RegExp(`^${persona.name}:\\s*`, "i"), "");
    return cleaned || null;
  } catch (err) {
    console.warn(`[brain] Gemini failed for ${persona.name}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Card voting decisions (rules-based)
// ---------------------------------------------------------------------------

export interface CardVoteDecision {
  shouldVote: boolean;
  optionIndex: number;
}

/**
 * Decide which option to vote for on a card.
 * Rules-based — no LLM needed.
 */
export function decideCardVote(
  persona: BotPersona,
  cardType: string,
  options: { label: string; votes: string[] }[],
  botUserId: string,
): CardVoteDecision {
  // Don't vote if already voted
  const alreadyVoted = options.some((o) => o.votes.includes(botUserId));
  if (alreadyVoted) return { shouldVote: false, optionIndex: -1 };

  switch (cardType) {
    case "time_proposal": {
      // Pick a random slot, biased toward earlier options (more likely available)
      const weights = options.map((_, i) => Math.max(1, options.length - i));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalWeight;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return { shouldVote: true, optionIndex: i };
      }
      return { shouldVote: true, optionIndex: 0 };
    }

    case "rsvp": {
      // Yes/No based on acceptRate
      const yesIndex = options.findIndex(
        (o) => o.label.toLowerCase() === "yes",
      );
      const noIndex = options.findIndex((o) => o.label.toLowerCase() === "no");
      if (yesIndex === -1) return { shouldVote: false, optionIndex: -1 };

      const accept = Math.random() < persona.decision.acceptRate;
      return {
        shouldVote: true,
        optionIndex: accept ? yesIndex : noIndex >= 0 ? noIndex : yesIndex,
      };
    }

    case "poll": {
      // Random option
      const idx = Math.floor(Math.random() * options.length);
      return { shouldVote: true, optionIndex: idx };
    }

    case "task_claim": {
      // Claim a random unclaimed task based on persona skills
      const unclaimed = options
        .map((o, i) => ({ ...o, idx: i }))
        .filter((o) => o.votes.length === 0);
      if (unclaimed.length === 0) return { shouldVote: false, optionIndex: -1 };

      // Simple: pick first unclaimed (could match on skills, but keep it simple)
      const pick = unclaimed[Math.floor(Math.random() * unclaimed.length)];
      return { shouldVote: true, optionIndex: pick.idx };
    }

    case "location": {
      // Confirm (first option)
      return { shouldVote: true, optionIndex: 0 };
    }

    default:
      return { shouldVote: false, optionIndex: -1 };
  }
}

// ---------------------------------------------------------------------------
// Should this bot reply to a message?
// ---------------------------------------------------------------------------

/**
 * Decide whether the bot should reply to a group message.
 * Direct mentions always trigger a reply; otherwise probabilistic.
 */
export function shouldReply(
  persona: BotPersona,
  message: string,
  isDirect: boolean,
): boolean {
  if (isDirect) return true;

  // Check for name mention
  const firstName = persona.name.split(" ")[0].toLowerCase();
  if (message.toLowerCase().includes(firstName)) return true;

  // Probabilistic based on persona
  return Math.random() < persona.decision.groupReplyRate;
}
