/**
 * Bot class — one instance per persona.
 *
 * Manages auth, Supabase Realtime subscriptions, and the reactive action loop.
 * Listens for events in all Spaces the bot is a member of, then delegates
 * to the brain (rules + Gemini) to decide and execute actions.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BotPersona } from "./personas";
import { ApiClient } from "./api-client";
import {
  generateReply,
  decideCardVote,
  shouldReply,
  type MessageContext,
} from "./brain";

export class Bot {
  readonly persona: BotPersona;
  private supabase!: SupabaseClient;
  private api!: ApiClient;
  private userId!: string;
  private accessToken!: string;
  private spaces: { id: string; name: string }[] = [];
  private botUserIds = new Set<string>();
  private recentMessages = new Map<string, MessageContext[]>();

  constructor(
    persona: BotPersona,
    private appUrl: string,
    private supabaseUrl: string,
    private supabaseKey: string,
    private password: string,
  ) {
    this.persona = persona;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async start() {
    // Sign in
    const authClient = createClient(this.supabaseUrl, this.supabaseKey, {
      auth: { autoRefreshToken: true, persistSession: false },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email: this.persona.email,
      password: this.password,
    });

    if (error || !data.session) {
      throw new Error(
        `Auth failed for ${this.persona.email}: ${error?.message ?? "no session"}`,
      );
    }

    this.userId = data.user.id;
    this.accessToken = data.session.access_token;

    // Create a Supabase client scoped to this user's JWT
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
      global: {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.api = new ApiClient(this.appUrl, this.accessToken);

    // Resolve all bot user IDs for loop prevention
    // Query profiles by full_name matching persona names
    const { PERSONAS } = await import("./personas");
    const botNames = PERSONAS.map((p) => p.name);
    const { data: botProfiles } = await this.supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("full_name", botNames);
    for (const p of botProfiles ?? []) {
      this.botUserIds.add(p.user_id);
    }

    // Discover spaces this bot is a member of
    const { data: memberships } = await this.supabase
      .from("space_members")
      .select("space_id, spaces:space_id (id, name)")
      .eq("user_id", this.userId);

    this.spaces = (memberships ?? [])
      .map((m) => {
        const space = m.spaces as unknown as { id: string; name: string };
        return space ? { id: space.id, name: space.name ?? "Space" } : null;
      })
      .filter(Boolean) as { id: string; name: string }[];

    console.log(
      `[${this.persona.name}] Online. Spaces: ${this.spaces.map((s) => s.name).join(", ")}`,
    );

    // Subscribe to each space
    for (const space of this.spaces) {
      this.subscribeToSpace(space);
    }

    // Subscribe to activity cards (invites, join requests, matches)
    this.subscribeToActivityCards();
  }

  async stop() {
    await this.supabase.removeAllChannels();
    console.log(`[${this.persona.name}] Offline.`);
  }

  // -------------------------------------------------------------------------
  // Subscriptions
  // -------------------------------------------------------------------------

  private subscribeToSpace(space: { id: string; name: string }) {
    // Messages
    this.supabase
      .channel(`bot-${this.userId}-msgs-${space.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "space_messages",
          filter: `space_id=eq.${space.id}`,
        },
        (payload) => this.onMessage(space, payload.new as SpaceMessage),
      )
      .subscribe();

    // Cards (new and updated)
    this.supabase
      .channel(`bot-${this.userId}-cards-${space.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "space_cards",
          filter: `space_id=eq.${space.id}`,
        },
        (payload) => this.onNewCard(space, payload.new as SpaceCardRow),
      )
      .subscribe();
  }

  private subscribeToActivityCards() {
    this.supabase
      .channel(`bot-${this.userId}-activity`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_cards",
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => this.onActivityCard(payload.new as ActivityCardRow),
      )
      .subscribe();
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private async onMessage(
    space: { id: string; name: string },
    msg: SpaceMessage,
  ) {
    // Ignore own messages and other bot messages
    if (msg.sender_id === this.userId) return;
    if (this.botUserIds.has(msg.sender_id)) return;
    if (msg.type !== "message") return;

    // Track recent messages for context
    const history = this.recentMessages.get(space.id) ?? [];
    // Resolve sender name
    const { data: profile } = await this.supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", msg.sender_id)
      .maybeSingle();

    history.push({
      senderName: profile?.full_name ?? "Someone",
      content: msg.content,
    });
    if (history.length > 10) history.shift();
    this.recentMessages.set(space.id, history);

    // Decide whether to reply
    const memberCount = this.spaces.length; // rough proxy
    const isDm = memberCount <= 2;
    if (!shouldReply(this.persona, msg.content, isDm)) return;

    // Delay to feel organic
    const [minDelay, maxDelay] = this.persona.decision.replyDelay;
    const delay = (minDelay + Math.random() * (maxDelay - minDelay)) * 1000;

    setTimeout(async () => {
      try {
        const reply = await generateReply(this.persona, history, space.name);
        if (!reply) return;

        // Send message via Supabase (exercises RLS + triggers)
        await this.supabase.from("space_messages").insert({
          space_id: space.id,
          sender_id: this.userId,
          type: "message",
          content: reply,
        });

        // Update space timestamp
        await this.supabase
          .from("spaces")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", space.id);

        console.log(
          `[${this.persona.name}] → ${space.name}: "${reply.slice(0, 60)}${reply.length > 60 ? "..." : ""}"`,
        );

        // After replying, check if system would suggest a card
        try {
          const suggestion = await this.api.suggestCard(space.id, reply);
          if (suggestion?.suggestion) {
            console.log(
              `[${this.persona.name}] Card suggestion available: ${suggestion.suggestion.suggested_type}`,
            );
            // Bots don't auto-create cards from suggestions (that's the human's role)
            // But we log it to verify the pipeline works
          }
        } catch {
          // Suggestion is best-effort
        }
      } catch (err) {
        console.error(
          `[${this.persona.name}] Reply failed in ${space.name}:`,
          err,
        );
      }
    }, delay);
  }

  private async onNewCard(
    space: { id: string; name: string },
    card: SpaceCardRow,
  ) {
    // Don't vote on own cards
    if (card.created_by === this.userId) return;

    const data = card.data as {
      options?: { label: string; votes: string[] }[];
    };
    if (!data?.options) return;

    const decision = decideCardVote(
      this.persona,
      card.type,
      data.options,
      this.userId,
    );

    if (!decision.shouldVote) return;

    // Delay before voting
    const [minDelay, maxDelay] = this.persona.decision.voteDelay;
    const delay = (minDelay + Math.random() * (maxDelay - minDelay)) * 1000;

    setTimeout(async () => {
      try {
        await this.api.voteOnCard(space.id, card.id, decision.optionIndex);
        const optionLabel = data.options![decision.optionIndex]?.label ?? "?";
        console.log(
          `[${this.persona.name}] Voted "${optionLabel}" on ${card.type} in ${space.name}`,
        );
      } catch (err) {
        console.error(
          `[${this.persona.name}] Vote failed on card ${card.id}:`,
          err,
        );
      }
    }, delay);
  }

  private async onActivityCard(card: ActivityCardRow) {
    // Handle invites and join requests
    if (card.type === "invite" && card.status === "pending") {
      const accept = Math.random() < this.persona.decision.acceptRate;
      const [minDelay, maxDelay] = this.persona.decision.voteDelay;
      const delay = (minDelay + Math.random() * (maxDelay - minDelay)) * 1000;

      setTimeout(async () => {
        try {
          const meta = card.metadata as {
            space_id?: string;
            posting_id?: string;
            invite_id?: string;
          };
          if (meta?.space_id && meta?.posting_id && meta?.invite_id) {
            const res = await fetch(
              `${this.appUrl}/api/spaces/${meta.space_id}/postings/${meta.posting_id}/invites/${meta.invite_id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${this.accessToken}`,
                },
                body: JSON.stringify({
                  response: accept ? "accepted" : "declined",
                }),
              },
            );
            console.log(
              `[${this.persona.name}] ${accept ? "Accepted" : "Declined"} invite (${res.status})`,
            );
          }
        } catch (err) {
          console.error(`[${this.persona.name}] Invite response failed:`, err);
        }
      }, delay);
    }
  }
}

// ---------------------------------------------------------------------------
// Row types (minimal, matching Supabase Realtime payloads)
// ---------------------------------------------------------------------------

interface SpaceMessage {
  id: string;
  space_id: string;
  sender_id: string;
  type: string;
  content: string;
  created_at: string;
}

interface SpaceCardRow {
  id: string;
  space_id: string;
  created_by: string;
  type: string;
  status: string;
  data: unknown;
  created_at: string;
}

interface ActivityCardRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  metadata: unknown;
  created_at: string;
}
