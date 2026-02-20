import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { encrypt, decrypt } from "../encryption";

// 32-byte hex key for testing
const TEST_KEY = "a".repeat(64);

describe("calendar/encryption", () => {
  beforeAll(() => {
    vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", TEST_KEY);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts and decrypts a string roundtrip", () => {
    const plaintext = "my-secret-access-token-12345";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "same-token";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    // Different ciphertexts due to random IV
    expect(a.toString("hex")).not.toBe(b.toString("hex"));
  });

  it("handles empty string", () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles unicode", () => {
    const plaintext = "token-with-émojis-🔐";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("handles long tokens", () => {
    const plaintext = "x".repeat(10000);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("test");
    // Flip a byte in the ciphertext portion
    encrypted[encrypted.length - 1] ^= 0xff;
    expect(() => decrypt(encrypted)).toThrow();
  });

  it("throws on truncated data", () => {
    const encrypted = encrypt("test");
    // Truncate to just the IV (12 bytes)
    const truncated = encrypted.subarray(0, 12);
    expect(() => decrypt(truncated)).toThrow();
  });

  it("throws when encryption key is missing", () => {
    vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", "");
    expect(() => encrypt("test")).toThrow("Missing CALENDAR_TOKEN_ENCRYPTION_KEY");
    vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", TEST_KEY);
  });

  it("throws when encryption key is wrong length", () => {
    vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", "short");
    expect(() => encrypt("test")).toThrow("must be a 64-character hex string");
    vi.stubEnv("CALENDAR_TOKEN_ENCRYPTION_KEY", TEST_KEY);
  });
});
