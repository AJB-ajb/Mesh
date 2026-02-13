/**
 * Embedding generation service using OpenAI text-embedding-3-small
 * Generates 1536-dimensional vectors for semantic similarity search
 */

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536;

/**
 * Generates an embedding vector for the given text
 * @param text The text to generate an embedding for
 * @returns A 1536-dimensional vector array
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.trim(),
        dimensions: EMBEDDING_DIMENSION,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}. ${JSON.stringify(error)}`,
      );
    }

    const data = await response.json();
    const embedding = data.data[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding response from OpenAI API");
    }

    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Expected embedding dimension ${EMBEDDING_DIMENSION}, got ${embedding.length}`,
      );
    }

    return embedding;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate embedding: ${String(error)}`);
  }
}

/**
 * Generates an embedding for a user profile
 * Combines bio, skills, and interests into a single text representation
 */
export async function generateProfileEmbedding(
  bio: string | null,
  skills: string[] | null,
  interests: string[] | null,
  headline: string | null,
): Promise<number[]> {
  const combinedText = composeProfileText(bio, skills, interests, headline);

  if (!combinedText.trim()) {
    throw new Error(
      "Profile must have at least one field (bio, skills, or interests)",
    );
  }

  return generateEmbedding(combinedText);
}

/**
 * Generates an embedding for a posting
 * Combines title, description, and required skills into a single text representation
 */
export async function generatePostingEmbedding(
  title: string,
  description: string,
  requiredSkills: string[] | null,
): Promise<number[]> {
  const combinedText = composePostingText(title, description, requiredSkills);
  return generateEmbedding(combinedText);
}

/**
 * Generates embeddings for multiple texts in a single OpenAI API call.
 * OpenAI's /v1/embeddings endpoint natively supports array input (up to 2048 items).
 * Returns embeddings in the same order as the input texts.
 */
export async function generateEmbeddingsBatch(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const trimmedTexts = texts.map((t) => t.trim());
  const emptyIndex = trimmedTexts.findIndex((t) => t.length === 0);
  if (emptyIndex !== -1) {
    throw new Error(`Text at index ${emptyIndex} cannot be empty`);
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: trimmedTexts,
      dimensions: EMBEDDING_DIMENSION,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}. ${JSON.stringify(error)}`,
    );
  }

  const data = await response.json();

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error("Invalid batch embedding response from OpenAI API");
  }

  // OpenAI returns results with an index field — sort by index to guarantee order
  const sorted = [...data.data].sort(
    (a: { index: number }, b: { index: number }) => a.index - b.index,
  );

  const embeddings: number[][] = sorted.map((item: { embedding: number[] }) => {
    if (
      !item.embedding ||
      !Array.isArray(item.embedding) ||
      item.embedding.length !== EMBEDDING_DIMENSION
    ) {
      throw new Error(
        `Invalid embedding in batch response (expected ${EMBEDDING_DIMENSION} dimensions)`,
      );
    }
    return item.embedding;
  });

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} embeddings, got ${embeddings.length}`,
    );
  }

  return embeddings;
}

/**
 * Composes text for a profile embedding from its fields.
 * Exported so the batch processor can compose texts without generating embeddings.
 */
export function composeProfileText(
  bio: string | null,
  skills: string[] | null,
  interests: string[] | null,
  headline: string | null,
): string {
  const parts: string[] = [];

  if (headline) parts.push(`Headline: ${headline}`);
  if (bio) parts.push(`About: ${bio}`);
  if (skills && skills.length > 0) parts.push(`Skills: ${skills.join(", ")}`);
  if (interests && interests.length > 0)
    parts.push(`Interests: ${interests.join(", ")}`);

  return parts.join("\n\n");
}

/**
 * Composes text for a posting embedding from its fields.
 * Exported so the batch processor can compose texts without generating embeddings.
 */
export function composePostingText(
  title: string,
  description: string,
  requiredSkills: string[] | null,
): string {
  const parts: string[] = [];

  parts.push(`Title: ${title}`);
  parts.push(`Description: ${description}`);
  if (requiredSkills && requiredSkills.length > 0)
    parts.push(`Required Skills: ${requiredSkills.join(", ")}`);

  return parts.join("\n\n");
}

/**
 * Validates that an embedding has the correct dimension
 */
export function validateEmbedding(embedding: number[] | null): boolean {
  if (!embedding) return false;
  if (!Array.isArray(embedding)) return false;
  if (embedding.length !== EMBEDDING_DIMENSION) return false;
  return true;
}
