/**
 * AES-256-GCM encryption for calendar OAuth tokens.
 *
 * Tokens are encrypted at the application level before being stored
 * as bytea in Supabase. This avoids dependency on pgsodium (deprecated).
 *
 * Key: CALENDAR_TOKEN_ENCRYPTION_KEY env var (32-byte hex string, 64 chars).
 */

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/** Buffer → Uint8Array (workaround for @types/node Buffer vs Uint8Array mismatch) */
function toU8(buf: Buffer): Uint8Array {
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function getKey(): Uint8Array {
  const hex = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "Missing CALENDAR_TOKEN_ENCRYPTION_KEY env var. Generate with: openssl rand -hex 32",
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      "CALENDAR_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).",
    );
  }
  return toU8(Buffer.from(hex, "hex"));
}

/**
 * Encrypt a plaintext string. Returns a Buffer suitable for bytea storage.
 * Format: [12-byte IV][16-byte auth tag][ciphertext]
 */
export function encrypt(plaintext: string): Buffer {
  const key = getKey();
  const iv = toU8(randomBytes(IV_LENGTH));
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encPart1 = toU8(cipher.update(plaintext, "utf8"));
  const encPart2 = toU8(cipher.final());
  const encrypted = new Uint8Array([...encPart1, ...encPart2]);
  const authTag = toU8(cipher.getAuthTag());

  return Buffer.from(new Uint8Array([...iv, ...authTag, ...encrypted]));
}

/**
 * Decrypt a Buffer back to plaintext.
 * Expects format: [12-byte IV][16-byte auth tag][ciphertext]
 */
export function decrypt(data: Buffer): string {
  const key = getKey();

  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Encrypted data is too short");
  }

  const iv = toU8(data.subarray(0, IV_LENGTH) as Buffer);
  const authTag = toU8(
    data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH) as Buffer,
  );
  const ciphertext = toU8(
    data.subarray(IV_LENGTH + AUTH_TAG_LENGTH) as Buffer,
  );

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decPart1 = toU8(decipher.update(ciphertext));
  const decPart2 = toU8(decipher.final());
  return Buffer.from(new Uint8Array([...decPart1, ...decPart2])).toString(
    "utf8",
  );
}
