-- RLS does not protect TRUNCATE. The captured predecessor granted it to client
-- roles, including on official lineups/events. Preserve all rows and ordinary
-- SELECT/INSERT/UPDATE/DELETE policies; only remove this table-wide capability.
begin;
revoke truncate on all tables in schema public from public, anon, authenticated;
-- Supabase migrations run as postgres. Prevent its future public tables from
-- inheriting the same unsafe default; other owners require preflight review.
alter default privileges for role postgres in schema public
  revoke truncate on tables from public, anon, authenticated;
commit;
