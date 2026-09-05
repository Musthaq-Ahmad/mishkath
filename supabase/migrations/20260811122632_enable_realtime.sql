-- Enable Realtime (postgres_changes) for the tables the public leaderboard
-- and dashboard subscribe to. No prior migration ever added these tables to
-- the supabase_realtime publication, so every .channel(...).on("postgres_changes",
-- ...) subscription in the app (published-results-feed, championship-sidebar,
-- info-cards-row, leaderboard-footer, the podium celebration layout) has
-- silently never received live change events — pages only ever reflected
-- fresh data on a hard reload, never a live push.
--
-- Idempotent: skips any table already in the publication, so this is safe to
-- run even if some tables were already added via the Dashboard's Replication
-- toggle.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'programs'
  ) then
    alter publication supabase_realtime add table public.programs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'scores'
  ) then
    alter publication supabase_realtime add table public.scores;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_scores'
  ) then
    alter publication supabase_realtime add table public.group_scores;
  end if;
end $$;
