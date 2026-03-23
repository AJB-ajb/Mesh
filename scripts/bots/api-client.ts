/**
 * HTTP client for calling Vercel-deployed API routes as a bot user.
 *
 * Uses Bearer JWT auth (requires the withAuth Bearer fallback).
 * Only needed for endpoints with server-side logic beyond Supabase
 * (card suggestions, etc.). Most operations go through the Supabase SDK.
 */

export class ApiClient {
  constructor(
    private baseUrl: string,
    private accessToken: string,
  ) {}

  private async fetch(path: string, init?: RequestInit) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${path}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  /** Call the fused detect-and-suggest endpoint */
  async suggestCard(
    spaceId: string,
    message: string,
  ): Promise<{ suggestion: CardSuggestion | null; reason?: string }> {
    const res = await this.fetch(`/api/spaces/${spaceId}/cards/suggest`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    return res.data ?? res;
  }

  /** Create a card (+ its message) in a space */
  async createCard(
    spaceId: string,
    payload: { type: string; data: unknown; deadline?: string | null },
  ) {
    const res = await this.fetch(`/api/spaces/${spaceId}/cards`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data?.card ?? res;
  }

  /** Vote on a card option */
  async voteOnCard(spaceId: string, cardId: string, optionIndex: number) {
    const res = await this.fetch(
      `/api/spaces/${spaceId}/cards/${cardId}/vote`,
      {
        method: "POST",
        body: JSON.stringify({ option_index: optionIndex }),
      },
    );
    return res.data ?? res;
  }
}

export interface CardSuggestion {
  suggested_type: string;
  confidence: number;
  reason: string;
  prefill: Record<string, unknown>;
}
