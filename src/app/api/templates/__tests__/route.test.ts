// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { testRequiresAuth } from "tests/utils/route-test-helpers";

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}));

// Chain: from().select().eq().order()
mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ order: mockOrder });

import { GET } from "../route";

function makeRequest() {
  return new Request("http://localhost/api/templates", { method: "GET" });
}

describe("GET /api/templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
  });

  testRequiresAuth(GET, makeRequest, { params: Promise.resolve({}) }, mockGetUser);

  it("returns templates for authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockOrder.mockResolvedValue({
      data: [
        {
          id: "t1",
          title: "Study Group",
          description: "desc",
          content: "content",
          category: "general",
          sort_order: 1,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.templates).toHaveLength(1);
    expect(body.templates[0].title).toBe("Study Group");
  });

  it("returns 500 on database error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
