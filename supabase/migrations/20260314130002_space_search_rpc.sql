-- Full-text search RPC for space messages
-- Uses security invoker so RLS (including visible_from) applies

create or replace function search_space_messages(
  target_space_id uuid, search_query text, result_limit int default 20
) returns table (
  message_id uuid, content text, sender_id uuid, sender_name text,
  created_at timestamptz, type text, rank real
) language sql stable security invoker as $$
  select sm.id, sm.content, sm.sender_id, p.full_name,
         sm.created_at, sm.type,
         ts_rank(to_tsvector('english', coalesce(sm.content, '')),
                 plainto_tsquery('english', search_query)) as rank
  from space_messages sm
  left join profiles p on p.user_id = sm.sender_id
  where sm.space_id = target_space_id
    and to_tsvector('english', coalesce(sm.content, ''))
        @@ plainto_tsquery('english', search_query)
  order by rank desc, sm.created_at desc
  limit result_limit;
$$;
