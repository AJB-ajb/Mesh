-- Fix: "Posted by Unknown" — profiles RLS was owner-only for SELECT,
-- blocking joined reads of other users' names in postings, matches, inbox.
-- Allow any authenticated user to read profiles (needed for core app functionality).

drop policy "Profiles are viewable by the owner" on public.profiles;

create policy "Profiles are viewable by authenticated users"
  on public.profiles
  for select
  using (auth.uid() is not null);
