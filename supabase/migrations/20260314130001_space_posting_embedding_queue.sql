-- Add embedding queue columns to space_postings for matching integration

alter table space_postings add column if not exists needs_embedding boolean not null default true;
alter table space_postings add column if not exists embedding_generated_at timestamptz;
alter table space_postings add column if not exists matched_at timestamptz;

-- Re-mark existing postings so the processor picks them up
update space_postings set needs_embedding = true where embedding is null;

-- Trigger: re-queue embedding when text changes
create or replace function mark_space_posting_needs_embedding()
returns trigger language plpgsql as $$
begin
  if NEW.text is distinct from OLD.text then
    NEW.needs_embedding := true;
    NEW.matched_at := null;
  end if;
  return NEW;
end;
$$;

create trigger trg_space_posting_reembed
  before update on space_postings for each row
  execute function mark_space_posting_needs_embedding();
