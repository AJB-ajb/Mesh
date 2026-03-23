-- Reply count RPC for sub-space thread rendering
-- Returns message counts for a set of sub-space IDs

create or replace function get_reply_counts(sub_space_ids uuid[])
returns table (space_id uuid, count bigint)
language sql stable as $$
  select space_id, count(*) as count
  from space_messages
  where space_id = any(sub_space_ids)
  group by space_id;
$$;
