import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock sonner — factory must not reference outer `const` (hoisted)
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Import after mocking
import { toast } from "sonner";
import { apiMutate } from "../api-mutate";

const mockToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("apiMutate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("sends a POST request with JSON body by default", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1 }),
    });

    const result = await apiMutate("/api/test", {
      body: { name: "test" },
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    expect(result.data).toEqual({ id: 1 });
    expect(result.status).toBe(200);
  });

  it("supports custom HTTP methods", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiMutate("/api/test", { method: "PATCH", body: { x: 1 } });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("omits body from request when not provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiMutate("/api/test", { method: "DELETE" });

    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("shows success toast when successToast is provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiMutate("/api/test", { successToast: "profileSaved" });

    expect(mockToast.success).toHaveBeenCalledWith("Profile saved");
  });

  it("does not show toast when no toast key is provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiMutate("/api/test");

    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("throws with server error message on non-OK response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: "Validation failed" } }),
    });

    await expect(apiMutate("/api/test")).rejects.toThrow("Validation failed");
  });

  it("parses string error format from server", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Bad input" }),
    });

    await expect(apiMutate("/api/test")).rejects.toThrow("Bad input");
  });

  it("uses errorFallback when server response is not JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not JSON")),
    });

    await expect(apiMutate("/api/test")).rejects.toThrow(
      "Something went wrong. Please try again.",
    );
  });

  it("uses custom errorFallback", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not JSON")),
    });

    await expect(
      apiMutate("/api/test", { errorFallback: "Custom error" }),
    ).rejects.toThrow("Custom error");
  });

  it("shows error toast on failure when errorToast is provided", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: "fail" } }),
    });

    await expect(
      apiMutate("/api/test", { errorToast: "genericError" }),
    ).rejects.toThrow();

    expect(mockToast.error).toHaveBeenCalledWith("Something went wrong");
  });
});
