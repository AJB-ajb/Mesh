-- Cache for skill string → skill_node_id normalization
-- Prevents repeated LLM calls for the same input strings
CREATE TABLE skill_normalization_cache (
  input_lower text PRIMARY KEY,
  skill_node_id uuid NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE skill_normalization_cache IS 'Caches normalized skill string → skill_node_id mappings to avoid repeated LLM calls';
