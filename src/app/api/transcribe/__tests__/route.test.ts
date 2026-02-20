// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ---------- Env mock ----------
const originalEnv = process.env.DEEPGRAM_API_KEY;

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// ---------- Fetch mock ----------
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "../route";

const routeContext = { params: Promise.resolve({}) };

describe("POST /api/transcribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEEPGRAM_API_KEY = "test-deepgram-key";
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.DEEPGRAM_API_KEY = originalEnv;
    } else {
      delete process.env.DEEPGRAM_API_KEY;
    }
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Unauthorized" },
    });

    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: new ArrayBuffer(10),
    });

    const res = await POST(req, routeContext);
    expect(res.status).toBe(401);
  });

  it("returns 500 when DEEPGRAM_API_KEY is not set", async () => {
    delete process.env.DEEPGRAM_API_KEY;

    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: new ArrayBuffer(10),
    });
    const res = await POST(req, routeContext);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when audio file is missing in multipart", async () => {
    const formData = new FormData();
    // No 'audio' field
    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it("returns 400 when audio data is empty (binary)", async () => {
    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "audio/webm" },
      body: new ArrayBuffer(0),
    });

    const res = await POST(req, routeContext);
    expect(res.status).toBe(400);
  });

  it("transcribes audio successfully (binary body)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          channels: [
            {
              alternatives: [{ transcript: "Hello world" }],
            },
          ],
        },
      }),
    });

    const audioData = new ArrayBuffer(100);
    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "audio/webm" },
      body: audioData,
    });

    const res = await POST(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transcript).toBe("Hello world");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api.deepgram.com"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Token test-deepgram-key",
        }),
      }),
    );
  });

  it("transcribes audio successfully (multipart)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          channels: [
            {
              alternatives: [{ transcript: "Testing multipart" }],
            },
          ],
        },
      }),
    });

    const file = new File([new ArrayBuffer(50)], "audio.webm", {
      type: "audio/webm",
    });
    const formData = new FormData();
    formData.append("audio", file);

    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transcript).toBe("Testing multipart");
  });

  it("returns 502 when Deepgram API fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "audio/webm" },
      body: new ArrayBuffer(100),
    });

    const res = await POST(req, routeContext);
    expect(res.status).toBe(502);
  });

  it("returns 500 when fetch throws a network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const req = new Request("http://localhost/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "audio/webm" },
      body: new ArrayBuffer(100),
    });

    const res = await POST(req, routeContext);
    expect(res.status).toBe(500);
  });
});
