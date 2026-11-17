-- Aggregate-only inventory. Does not export players or impersonate an Auth session.
begin read only;
select t.name,t.category,
 (select count(*) from app_private.callup_roster r where r.team_id=t.id and r.active) internal_active,
 count(distinct m.id) verified_reports,count(distinct l.player_id) historical_identities
from public.teams t
left join public.federation_team_entries e on e.club_team_id=t.id
left join public.federation_match_teams mt on mt.entry_id=e.id
left join public.federation_matches m on m.id=mt.match_id and m.raw_data->>'report_status'='verified'
 and m.raw_data->>(mt.side||'_team_id')=e.external_team_id
left join public.federation_match_lineups l on l.match_id=m.id and l.side=mt.side
where t.category in ('FEM15','FEM 11') or (t.name='IGUALADA HC D' and t.category='INFANTIL')
group by t.id order by t.category;
select to_regprocedure('public.read_callup_workflow(uuid,uuid)') is not null as new_workflow_installed;
rollback;
