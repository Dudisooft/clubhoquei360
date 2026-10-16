-- Published season totals only. Do not sum repeated team rows or infer absent values.
insert into public.federation_player_competition_stats(id,player_id,competition_id,team_external_id,player_display_name,games,goals,assists,blue_cards,yellow_cards,red_cards,goals_attribution,fetched_at,raw_data)
select md5('clubhoquei360:official-season-stats:'||r.player_id::text||':'||e.competition_id::text)::uuid,r.player_id,e.competition_id,
 case when count(distinct e.external_team_id)=1 then min(e.external_team_id) else null end,min(r.display_name),
 case when count(distinct r.raw_data->>'games')=1 and min(r.raw_data->>'games')~'^[0-9]+$' then min(r.raw_data->>'games')::integer else null end,
 case when count(distinct r.raw_data->>'goals')=1 and min(r.raw_data->>'goals')~'^[0-9]+$' then min(r.raw_data->>'goals')::integer else null end,
 case when count(distinct r.raw_data->>'assists')=1 and min(r.raw_data->>'assists')~'^[0-9]+$' then min(r.raw_data->>'assists')::integer else null end,
 case when count(distinct r.raw_data->>'blue_cards')=1 and min(r.raw_data->>'blue_cards')~'^[0-9]+$' then min(r.raw_data->>'blue_cards')::integer else null end,null,
 case when count(distinct r.raw_data->>'red_cards')=1 and min(r.raw_data->>'red_cards')~'^[0-9]+$' then min(r.raw_data->>'red_cards')::integer else null end,
 'unverified',max(r.fetched_at),jsonb_build_object('data_layer','public_federation','importer','official-season-v1','source','published_competition_roster','aggregation','equal_values_only_never_sum','by_team',jsonb_agg(jsonb_build_object('entry_id',e.id,'team_id',e.external_team_id,'reported',r.raw_data,'source_url',e.source_url)))
from public.federation_team_roster r join public.federation_team_entries e on e.id=r.entry_id
where r.role='player' and r.player_id is not null
group by r.player_id,e.competition_id
on conflict(player_id,competition_id) do update set games=coalesce(excluded.games,public.federation_player_competition_stats.games),goals=coalesce(excluded.goals,public.federation_player_competition_stats.goals),assists=coalesce(excluded.assists,public.federation_player_competition_stats.assists),blue_cards=coalesce(excluded.blue_cards,public.federation_player_competition_stats.blue_cards),red_cards=coalesce(excluded.red_cards,public.federation_player_competition_stats.red_cards),fetched_at=excluded.fetched_at,raw_data=excluded.raw_data
where public.federation_player_competition_stats.raw_data->>'importer'='official-season-v1';
