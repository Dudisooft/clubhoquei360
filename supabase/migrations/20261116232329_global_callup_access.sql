-- Global access is bound to the active server-side platform role.
-- Club and team memberships retain their existing permissions.
create or replace function app_private.callup_can_edit(p_club uuid,p_team uuid)
returns boolean language sql stable set search_path='' as $$
 select auth.uid() is not null and coalesce((
  app_private.is_platform_superadmin() or
  app_private.has_club_role(p_club,array['general_coordinator']) or
  app_private.has_team_role(p_team,array['section_coordinator'])
 ),false)
$$;
