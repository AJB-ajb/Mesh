import { labels } from "@/lib/labels";

export interface TextToolResult {
  result: string;
  changed: boolean;
}

/** Thrown on API errors (non-2xx) — message contains the server-provided reason. */
export class TextToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextToolError";
  }
}

/**
 * Call the /api/format endpoint and return the formatted text.
 * Throws `TextToolError` on API failure, or a raw error on network failure.
 */
export async function autoFormat(text: string): Promise<TextToolResult> {
  const res = await fetch("/api/format", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new TextToolError(
      data.error?.message ?? labels.textTools.errorFormat,
    );
  }

  const data: { formatted: string } = await res.json();
  return { result: data.formatted, changed: data.formatted !== text };
}

/**
 * Call the /api/clean endpoint and return the cleaned text.
 * Throws `TextToolError` on API failure, or a raw error on network failure.
 */
export async function autoClean(text: string): Promise<TextToolResult> {
  const res = await fetch("/api/clean", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new TextToolError(data.error?.message ?? labels.textTools.errorClean);
  }

  const data: { cleaned: string } = await res.json();
  return { result: data.cleaned, changed: data.cleaned !== text };
}
