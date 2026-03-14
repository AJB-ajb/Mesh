-- Prevent removing or demoting the last admin of a space.
-- Enforced at the DB level to avoid TOCTOU races in application code.

create or replace function prevent_last_admin_removal()
returns trigger
language plpgsql
as $$
declare
  remaining_admins integer;
begin
  -- Only act when an admin row is being removed or demoted
  if TG_OP = 'DELETE' then
    if OLD.role <> 'admin' then
      return OLD;
    end if;
  elsif TG_OP = 'UPDATE' then
    -- Only care if role is changing away from admin
    if OLD.role <> 'admin' or NEW.role = 'admin' then
      return NEW;
    end if;
  end if;

  -- Count remaining admins *excluding* the row being modified
  select count(*) into remaining_admins
    from space_members
   where space_id = OLD.space_id
     and role = 'admin'
     and user_id <> OLD.user_id;

  if remaining_admins = 0 then
    raise exception 'Cannot remove or demote the last admin of a space'
      using errcode = 'check_violation';
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

create trigger trg_prevent_last_admin_removal
  before delete or update on space_members
  for each row
  execute function prevent_last_admin_removal();
