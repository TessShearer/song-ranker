-- Saved progress for the comparison ("this or that") ranking, one row per user per artist.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.ranking_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  artist_id text not null,
  status text not null default 'in_progress',
  data jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, artist_id)
);

alter table public.ranking_sessions enable row level security;

create policy "Users manage their own ranking sessions"
  on public.ranking_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
