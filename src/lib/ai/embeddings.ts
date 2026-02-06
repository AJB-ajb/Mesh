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
  const parts: string[] = [];

  if (headline) {
    parts.push(`Headline: ${headline}`);
  }

  if (bio) {
    parts.push(`About: ${bio}`);
  }

  if (skills && skills.length > 0) {
    parts.push(`Skills: ${skills.join(", ")}`);
  }

  if (interests && interests.length > 0) {
    parts.push(`Interests: ${interests.join(", ")}`);
  }

  const combinedText = parts.join("\n\n");

  if (!combinedText.trim()) {
    throw new Error(
      "Profile must have at least one field (bio, skills, or interests)",
    );
  }

  return generateEmbedding(combinedText);
}

/**
 * Generates an embedding for a project
 * Combines title, description, and required skills into a single text representation
 */
export async function generateProjectEmbedding(
  title: string,
  description: string,
  requiredSkills: string[] | null,
): Promise<number[]> {
  const parts: string[] = [];

  parts.push(`Title: ${title}`);
  parts.push(`Description: ${description}`);

  if (requiredSkills && requiredSkills.length > 0) {
    parts.push(`Required Skills: ${requiredSkills.join(", ")}`);
  }

  const combinedText = parts.join("\n\n");

  return generateEmbedding(combinedText);
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
