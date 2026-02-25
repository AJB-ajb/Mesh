-- Migration: Add HNSW indexes on embedding columns
-- HNSW (Hierarchical Navigable Small World) gives better recall than IVFFlat
-- and doesn't require a training step. Requires pgvector >= 0.5.

CREATE INDEX IF NOT EXISTS profiles_embedding_idx
  ON profiles USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS postings_embedding_idx
  ON postings USING hnsw (embedding vector_cosine_ops);
