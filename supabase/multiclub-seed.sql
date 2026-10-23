-- Review and apply only after the migration. No memberships, invented teams or imports.
insert into public.club_settings(club_id,slug,official_name,short_name,crest_url,primary_color,secondary_color,contrast_color,active_season_id,verification_status)
select c.id,'igualada',c.name,c.short_name,'https://sidgad.cloud/fecapa/images/logos_clubes/252_1.png','#194b9b','#112f64','#ffffff',s.id,'verified'
from public.clubs c join public.seasons s on s.club_id=c.id and s.label='2026/27' where c.id=md5('clubhoquei360:fecapa:club:252')::uuid on conflict do nothing;
insert into public.clubs(id,name,short_name) values(md5('clubhoquei360:club:cp-manresa')::uuid,'Club Patí Manresa','CPM') on conflict do nothing;
-- Provisional presentation colours; no claim of official branding or verified crest.
insert into public.club_settings(club_id,slug,official_name,short_name,primary_color,secondary_color,contrast_color)
values(md5('clubhoquei360:club:cp-manresa')::uuid,'manresa','Club Patí Manresa','CPM','#ad283a','#6d1928','#ffffff') on conflict do nothing;
insert into public.club_federation_sources(club_id,season_id,federation,external_club_id,competition_id,verified_team_ids)
select c.club_id,c.season_id,c.federation,case when c.federation='FECAPA' then '252' else '69' end,c.id,array_agg(distinct e.external_team_id)
from public.federation_competitions c join public.federation_team_entries e on e.competition_id=c.id
where c.club_id=md5('clubhoquei360:fecapa:club:252')::uuid and c.external_competition_id<>'4802'
group by c.id,c.club_id,c.season_id,c.federation on conflict do nothing;
-- FEM15 deliberately retains its existing dedicated importer and six-hour cache.
