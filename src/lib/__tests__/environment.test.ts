import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Need to reset module cache between tests since environment.ts reads env at import time
describe("environment", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("isProduction returns true when NEXT_PUBLIC_VERCEL_URL matches production", async () => {
    process.env.NEXT_PUBLIC_VERCEL_URL = "mesh-it.vercel.app";
    const { isProduction } = await import("../environment");
    expect(isProduction()).toBe(true);
  });

  it("isProduction returns true when VERCEL_URL matches production", async () => {
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    process.env.VERCEL_URL = "mesh-it.vercel.app";
    const { isProduction } = await import("../environment");
    expect(isProduction()).toBe(true);
  });

  it("isProduction returns false for non-production URLs", async () => {
    process.env.NEXT_PUBLIC_VERCEL_URL = "preview-123.vercel.app";
    process.env.VERCEL_URL = "preview-123.vercel.app";
    const { isProduction } = await import("../environment");
    expect(isProduction()).toBe(false);
  });

  it("getEnvironmentName returns correct names", async () => {
    process.env.NEXT_PUBLIC_VERCEL_URL = "mesh-it.vercel.app";
    const mod1 = await import("../environment");
    expect(mod1.getEnvironmentName()).toBe("Production");
  });
});
