-- =============================================================================
-- Spaces Rewrite: Phase 1 Migration
-- Creates the Spaces data model: spaces, members, messages, postings,
-- join requests, invites, and activity cards.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Core tables
-- ---------------------------------------------------------------------------

create table spaces (
  id              uuid primary key default gen_random_uuid(),
  name            text,
  state_text      text,
  parent_space_id uuid references spaces(id) on delete cascade,
  source_posting_id uuid,  -- FK added after space_postings is created
  created_by      uuid not null references profiles(user_id),
  is_global       boolean not null default false,
  inherits_members boolean not null default false,
  settings        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_spaces_parent on spaces(parent_space_id) where parent_space_id is not null;
create unique index idx_spaces_global on spaces(is_global) where is_global = true;

-- ---------------------------------------------------------------------------

create table space_members (
  space_id      uuid not null references spaces(id) on delete cascade,
  user_id       uuid not null references profiles(user_id) on delete cascade,
  role          text not null default 'member' check (role in ('member', 'admin')),
  joined_at     timestamptz not null default now(),
  visible_from  timestamptz not null default now(),
  last_read_at  timestamptz not null default now(),
  unread_count  integer not null default 0,
  muted         boolean not null default false,
  pinned        boolean not null default false,
  pin_order     integer,
  primary key (space_id, user_id)
);

create index idx_space_members_user on space_members(user_id);
create index idx_space_members_pinned on space_members(user_id) where pinned = true;

-- ---------------------------------------------------------------------------

create table space_messages (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references spaces(id) on delete cascade,
  sender_id     uuid references profiles(user_id),
  type          text not null check (type in ('message', 'posting', 'system', 'card')),
  content       text,
  posting_id    uuid,  -- FK added after space_postings is created
  card_id       uuid,  -- reserved for Phase 2 space_cards
  created_at    timestamptz not null default now()
);

create index idx_space_messages_space on space_messages(space_id, created_at);
create index idx_space_messages_posting on space_messages(posting_id) where posting_id is not null;

-- ---------------------------------------------------------------------------

create table space_postings (
  id                uuid primary key default gen_random_uuid(),
  space_id          uuid not null references spaces(id) on delete cascade,
  sub_space_id      uuid references spaces(id),
  created_by        uuid not null references profiles(user_id),
  text              text not null,
  category          text,
  tags              text[] not null default '{}',
  capacity          integer default 1,
  team_size_min     integer default 1,
  deadline          timestamptz,
  activity_date     timestamptz,
  visibility        text not null default 'public' check (visibility in ('public', 'private')),
  auto_accept       boolean not null default false,
  status            text not null default 'open' check (status in ('open', 'active', 'closed', 'filled', 'expired')),
  extracted_metadata jsonb not null default '{}',
  embedding         vector(1536),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_space_postings_space on space_postings(space_id, created_at);
create index idx_space_postings_status on space_postings(space_id, status);

-- ---------------------------------------------------------------------------
-- 2. Back-references (deferred FKs)
-- ---------------------------------------------------------------------------

alter table spaces
  add constraint fk_spaces_source_posting
  foreign key (source_posting_id) references space_postings(id) on delete set null;

alter table space_messages
  add constraint fk_messages_posting
  foreign key (posting_id) references space_postings(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Supporting tables
-- ---------------------------------------------------------------------------

create table space_join_requests (
  id            uuid primary key default gen_random_uuid(),
  posting_id    uuid not null references space_postings(id) on delete cascade,
  user_id       uuid not null references profiles(user_id) on delete cascade,
  status        text not null default 'pending' check (status in (
    'pending', 'accepted', 'rejected', 'withdrawn', 'waitlisted'
  )),
  responses     jsonb,
  waitlist_position integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (posting_id, user_id)
);

-- ---------------------------------------------------------------------------

create table space_invites (
  id              uuid primary key default gen_random_uuid(),
  posting_id      uuid not null references space_postings(id) on delete cascade,
  created_by      uuid not null references profiles(user_id),
  mode            text not null check (mode in ('sequential', 'parallel')),
  ordered_list    uuid[] not null,
  current_index   integer not null default 0,
  concurrent_max  integer not null default 1,
  pending         uuid[] not null default '{}',
  declined        uuid[] not null default '{}',
  status          text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------

create table activity_cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(user_id) on delete cascade,
  type          text not null check (type in (
    'match', 'invite', 'scheduling', 'connection_request', 'rsvp', 'join_request'
  )),
  title         text not null default '',
  subtitle      text,
  space_id      uuid references spaces(id) on delete cascade,
  posting_id    uuid references space_postings(id) on delete cascade,
  from_user_id  uuid references profiles(user_id),
  score         real,
  data          jsonb not null default '{}',
  status        text not null default 'pending' check (status in ('pending', 'acted', 'dismissed', 'expired')),
  created_at    timestamptz not null default now(),
  acted_at      timestamptz
);

create index idx_activity_cards_user on activity_cards(user_id, status, created_at desc);
create index idx_activity_cards_pending on activity_cards(user_id) where status = 'pending';

-- ---------------------------------------------------------------------------
-- 4. Expand posting_skills and availability_windows with space_posting_id
-- ---------------------------------------------------------------------------

alter table posting_skills
  add column space_posting_id uuid references space_postings(id) on delete cascade;

alter table availability_windows
  add column space_posting_id uuid references space_postings(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 5. Full-text search indexes
-- ---------------------------------------------------------------------------

create index idx_space_messages_fts on space_messages
  using gin (to_tsvector('english', coalesce(content, '')));

create index idx_space_postings_fts on space_postings
  using gin (to_tsvector('english', text));

-- ---------------------------------------------------------------------------
-- 6. Functions
-- ---------------------------------------------------------------------------

-- is_space_member: recursive CTE walking inherits_members chain
create or replace function is_space_member(p_space_id uuid, p_user_id uuid)
returns boolean as $$
  with recursive chain as (
    select id, parent_space_id, inherits_members, is_global
    from spaces where id = p_space_id
    union all
    select s.id, s.parent_space_id, s.inherits_members, s.is_global
    from spaces s
    join chain c on s.id = c.parent_space_id
    where c.inherits_members = true
  )
  select exists (
    select 1 from chain where is_global = true
    union all
    select 1 from chain c
    join space_members m on m.space_id = c.id
    where m.user_id = p_user_id
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- 7. Triggers
-- ---------------------------------------------------------------------------

-- Increment unread count for all members except sender on message insert
create or replace function trg_increment_unread_count()
returns trigger as $$
begin
  update space_members
  set unread_count = unread_count + 1
  where space_id = NEW.space_id
    and user_id is distinct from NEW.sender_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_space_messages_unread
  after insert on space_messages
  for each row
  execute function trg_increment_unread_count();

-- set_updated_at trigger function (reuse if exists, create if not)
create or replace function set_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_spaces_updated_at
  before update on spaces
  for each row execute function set_updated_at();

create trigger trg_space_postings_updated_at
  before update on space_postings
  for each row execute function set_updated_at();

create trigger trg_space_join_requests_updated_at
  before update on space_join_requests
  for each row execute function set_updated_at();

create trigger trg_space_invites_updated_at
  before update on space_invites
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. RLS Policies
-- ---------------------------------------------------------------------------

alter table spaces enable row level security;
alter table space_members enable row level security;
alter table space_messages enable row level security;
alter table space_postings enable row level security;
alter table space_join_requests enable row level security;
alter table space_invites enable row level security;
alter table activity_cards enable row level security;

-- spaces: SELECT — member, global, or public
create policy spaces_select on spaces for select using (
  is_global = true
  or settings->>'visibility' = 'public'
  or is_space_member(id, auth.uid())
);

-- spaces: INSERT — any authenticated user
create policy spaces_insert on spaces for insert
  with check (auth.uid() is not null);

-- spaces: UPDATE — admin only
create policy spaces_update on spaces for update using (
  exists (
    select 1 from space_members
    where space_id = id and user_id = auth.uid() and role = 'admin'
  )
);

-- spaces: DELETE — admin only
create policy spaces_delete on spaces for delete using (
  exists (
    select 1 from space_members
    where space_id = id and user_id = auth.uid() and role = 'admin'
  )
);

-- space_members: SELECT — member of the space
create policy space_members_select on space_members for select using (
  is_space_member(space_id, auth.uid())
);

-- space_members: INSERT — admin or self-join
create policy space_members_insert on space_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from space_members existing
      where existing.space_id = space_members.space_id
        and existing.user_id = auth.uid() and existing.role = 'admin'
    )
  );

-- space_members: UPDATE — self or admin
create policy space_members_update on space_members for update using (
  user_id = auth.uid()
  or exists (
    select 1 from space_members sm
    where sm.space_id = space_members.space_id
      and sm.user_id = auth.uid() and sm.role = 'admin'
  )
);

-- space_members: DELETE — self (leave) or admin
create policy space_members_delete on space_members for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from space_members sm
    where sm.space_id = space_members.space_id
      and sm.user_id = auth.uid() and sm.role = 'admin'
  )
);

-- space_messages: SELECT — member (visible_from respected)
create policy space_messages_select on space_messages for select using (
  is_space_member(space_id, auth.uid())
);

-- space_messages: INSERT — member
create policy space_messages_insert on space_messages for insert
  with check (
    sender_id = auth.uid()
    and is_space_member(space_id, auth.uid())
  );

-- space_postings: SELECT — member of space or global
create policy space_postings_select on space_postings for select using (
  is_space_member(space_id, auth.uid())
);

-- space_postings: INSERT — member of space
create policy space_postings_insert on space_postings for insert
  with check (
    created_by = auth.uid()
    and is_space_member(space_id, auth.uid())
  );

-- space_postings: UPDATE — creator only
create policy space_postings_update on space_postings for update using (
  created_by = auth.uid()
);

-- space_postings: DELETE — creator only
create policy space_postings_delete on space_postings for delete using (
  created_by = auth.uid()
);

-- space_join_requests: SELECT — requester or posting creator
create policy space_join_requests_select on space_join_requests for select using (
  user_id = auth.uid()
  or exists (
    select 1 from space_postings
    where id = space_join_requests.posting_id
      and created_by = auth.uid()
  )
);

-- space_join_requests: INSERT — any authenticated user
create policy space_join_requests_insert on space_join_requests for insert
  with check (user_id = auth.uid());

-- space_join_requests: UPDATE — requester or posting creator
create policy space_join_requests_update on space_join_requests for update using (
  user_id = auth.uid()
  or exists (
    select 1 from space_postings
    where id = space_join_requests.posting_id
      and created_by = auth.uid()
  )
);

-- space_invites: SELECT — creator or invitee
create policy space_invites_select on space_invites for select using (
  created_by = auth.uid()
  or auth.uid() = any(ordered_list)
);

-- space_invites: INSERT — posting creator
create policy space_invites_insert on space_invites for insert
  with check (
    exists (
      select 1 from space_postings
      where id = space_invites.posting_id
        and created_by = auth.uid()
    )
  );

-- space_invites: UPDATE — creator or invitee
create policy space_invites_update on space_invites for update using (
  created_by = auth.uid()
  or auth.uid() = any(ordered_list)
);

-- space_invites: DELETE — creator only
create policy space_invites_delete on space_invites for delete using (
  created_by = auth.uid()
);

-- activity_cards: full access for owner
create policy activity_cards_select on activity_cards for select using (
  user_id = auth.uid()
);

create policy activity_cards_insert on activity_cards for insert
  with check (auth.uid() is not null);

create policy activity_cards_update on activity_cards for update using (
  user_id = auth.uid()
);

create policy activity_cards_delete on activity_cards for delete using (
  user_id = auth.uid()
);

-- ---------------------------------------------------------------------------
-- 9. Enable Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table space_messages;
alter publication supabase_realtime add table space_members;
alter publication supabase_realtime add table spaces;
alter publication supabase_realtime add table space_postings;
alter publication supabase_realtime add table activity_cards;

-- ---------------------------------------------------------------------------
-- 10. Seed data
-- ---------------------------------------------------------------------------

-- Insert Global Space (Explore) — fixed UUID for app reference
insert into spaces (id, name, state_text, created_by, is_global, settings)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Explore',
  'The global discovery space. Browse and post activities visible to everyone.',
  (select user_id from profiles order by created_at limit 1),
  true,
  '{"posting_only": true, "visibility": "public"}'::jsonb
where exists (select 1 from profiles limit 1);

-- Create 2-person Spaces for existing accepted friendships
do $$
declare
  f record;
  new_space_id uuid;
begin
  for f in
    select fr.user_id, fr.friend_id
    from friendships fr
    where fr.status = 'accepted'
  loop
    new_space_id := gen_random_uuid();

    -- DM spaces have null name (client derives from the other person)
    insert into spaces (id, name, created_by, settings)
    values (new_space_id, null, f.user_id, '{"visibility": "private"}'::jsonb);

    insert into space_members (space_id, user_id, role)
    values
      (new_space_id, f.user_id, 'admin'),
      (new_space_id, f.friend_id, 'admin');
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Matching RPCs for space_postings
-- ---------------------------------------------------------------------------

-- match_postings_to_user_v2: queries space_postings with pgvector cosine similarity
-- against the user's profile embedding. Optional scope_space_id limits to a single space.
create or replace function match_postings_to_user_v2(
  target_user_id uuid,
  match_count int default 10,
  scope_space_id uuid default null
)
returns table (
  posting_id uuid,
  score float,
  posting_text text,
  posting_category text,
  posting_tags text[],
  posting_created_by uuid,
  space_id uuid
)
language plpgsql
security definer
as $$
declare
  user_emb extensions.vector(1536);
begin
  -- Fetch the user's profile embedding
  select p.embedding into user_emb
  from public.profiles p
  where p.user_id = target_user_id;

  if user_emb is null then
    return;
  end if;

  return query
  select
    sp.id as posting_id,
    (1 - (sp.embedding <=> user_emb))::float as score,
    sp.text as posting_text,
    sp.category as posting_category,
    sp.tags as posting_tags,
    sp.created_by as posting_created_by,
    sp.space_id
  from public.space_postings sp
  where
    sp.status = 'open'
    and sp.embedding is not null
    and sp.created_by != target_user_id
    -- Scope to a single space when provided
    and (scope_space_id is null or sp.space_id = scope_space_id)
    -- Only public postings when searching across spaces
    and (scope_space_id is not null or sp.visibility = 'public')
  order by score desc
  limit match_count;
end;
$$;

comment on function match_postings_to_user_v2 is
  'Finds top matching space_postings for a user via pgvector cosine similarity. Optional scope_space_id limits results to a single space.';

-- match_users_to_posting_v2: queries profiles with pgvector cosine similarity
-- against a space_posting's embedding.
create or replace function match_users_to_posting_v2(
  target_posting_id uuid,
  match_count int default 10
)
returns table (
  user_id uuid,
  score float
)
language plpgsql
security definer
as $$
declare
  posting_emb extensions.vector(1536);
  posting_creator uuid;
begin
  -- Fetch the posting's embedding and creator
  select sp.embedding, sp.created_by
  into posting_emb, posting_creator
  from public.space_postings sp
  where sp.id = target_posting_id;

  if posting_emb is null then
    return;
  end if;

  return query
  select
    pr.user_id,
    (1 - (pr.embedding <=> posting_emb))::float as score
  from public.profiles pr
  where
    pr.embedding is not null
    and pr.user_id != posting_creator
  order by score desc
  limit match_count;
end;
$$;

comment on function match_users_to_posting_v2 is
  'Finds top matching profiles for a space_posting via pgvector cosine similarity.';
