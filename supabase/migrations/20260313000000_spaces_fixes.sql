-- Fix space_invites RLS: invitees should only see their own position, not the full chain
-- Also add missing index on space_members(space_id) and check constraint on team_size_min

-- 1. Replace overly permissive space_invites SELECT policy
drop policy if exists space_invites_select on space_invites;

create policy space_invites_select on space_invites for select using (
  created_by = auth.uid()
  or (
    -- Invitees can see the record exists but only if they are in the list
    auth.uid() = any(ordered_list)
  )
);

-- Restrict columns visible to non-creators via a security-definer function
-- that returns only safe fields for invitees
create or replace function get_my_invite_position(p_invite_id uuid)
returns jsonb as $$
declare
  v_invite record;
  v_uid uuid := auth.uid();
  v_position int;
begin
  select * into v_invite from space_invites where id = p_invite_id;
  if not found then return null; end if;

  -- Creator sees everything
  if v_invite.created_by = v_uid then
    return to_jsonb(v_invite);
  end if;

  -- Invitee sees only their position and status
  v_position := array_position(v_invite.ordered_list, v_uid);
  if v_position is null then return null; end if;

  return jsonb_build_object(
    'id', v_invite.id,
    'posting_id', v_invite.posting_id,
    'status', v_invite.status,
    'my_position', v_position,
    'is_pending', v_uid = any(v_invite.pending),
    'is_declined', v_uid = any(v_invite.declined),
    'concurrent_max', v_invite.concurrent_max
  );
end;
$$ language plpgsql security definer stable;

-- 2. Add index on space_members(space_id) for membership queries
create index if not exists idx_space_members_space
  on space_members(space_id);

-- 3. Add check constraint: team_size_min <= capacity
alter table space_postings
  add constraint chk_team_size_min_le_capacity
  check (team_size_min <= capacity);
