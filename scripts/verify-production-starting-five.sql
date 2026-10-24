-- Transactional smoke test, AFTER installing the new migration. Always rolls
-- back. Uses the existing real operator, no new Auth accounts or role grants.
-- Manual rival entries are explicitly FICTITIOUS and never persist.
begin;
set local lock_timeout='3s';
do $$declare actor uuid;target uuid:='18fa0a6e-e5c6-487e-8315-5bc371e22cb1';begin
 if exists(select 1 from public.pilot_players where match_id=target)
 or exists(select 1 from public.pilot_operator_state where match_id=target)
 or exists(select 1 from public.pilot_events where match_id=target) then
  raise exception 'Real preparation/play already exists; do not run this smoke test';end if;
 select m.user_id into strict actor from public.pilot_members m join public.platform_admins a on a.user_id=m.user_id
 where m.match_id=target and m.role='operator' and a.role='platform_superadmin' and a.enabled;
 perform set_config('request.jwt.claim.sub',actor::text,true);
end $$;
set local role authenticated;
do $$declare target uuid:='18fa0a6e-e5c6-487e-8315-5bc371e22cb1';cat jsonb;input jsonb;home jsonb;away jsonb;state jsonb;saved jsonb;mutation uuid:=gen_random_uuid();row_id uuid:=gen_random_uuid();denied boolean:=false;home_count int;away_count int;begin
 cat:=public.pilot_roster_catalogue(target)->'candidates';
 select count(*) filter(where value->>'team'='home'),count(*) filter(where value->>'team'='away') into home_count,away_count from jsonb_array_elements(cat);
 with pool as (select value,row_number() over(partition by value->>'position' order by value->>'roster_id') n from jsonb_array_elements(cat) where value->>'team'='home')
 select jsonb_agg(jsonb_build_object('team','home','roster_id',value->>'roster_id','dorsal',null,'position',value->>'position')) into input from pool where (value->>'position'='goalkeeper' and n=1) or(value->>'position'='field' and n<=4);
 if jsonb_array_length(input) is distinct from 5 then raise exception 'Insufficient verified own-team catalogue for smoke test';end if;
 home:=public.pilot_prepare_players(target,mutation,input);
 if home is distinct from public.pilot_prepare_players(target,mutation,input) then raise exception 'Player retry duplicated';end if;
 select jsonb_agg(jsonb_build_object('team','away','manual',true,'full_name','PROVA FICTÍCIA REVERTIDA '||i,'dorsal',i::text,'position',case when i=1 then 'goalkeeper' else 'field' end)) into input from generate_series(1,5)i;
 away:=public.pilot_prepare_players(target,gen_random_uuid(),input);
 begin insert into public.pilot_events(id,match_id,user_id,event_type,team,delta,match_second,payload) values(row_id,target,auth.uid(),'goal','home',1,0,'{"kind":"gol"}');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Official write allowed before confirmation';end if;
 select jsonb_build_object('starterSelections',jsonb_build_object('home',(select jsonb_agg(value->'id') from jsonb_array_elements(home)),'away',(select jsonb_agg(value->'id') from jsonb_array_elements(away)))) into state;
 mutation:=gen_random_uuid();saved:=public.pilot_confirm_lineup(target,mutation,0,state);
 if saved is distinct from public.pilot_confirm_lineup(target,mutation,0,state) then raise exception 'Confirmation retry duplicated';end if;
 if not app_private.pilot_calendar_ready(target) or jsonb_array_length(saved#>'{state,players}')<>10 then raise exception 'Prepared lineup not usable';end if;
 insert into public.pilot_events(id,match_id,user_id,event_type,team,delta,match_second,payload) values(row_id,target,auth.uid(),'goal','home',1,10,'{"kind":"gol","details":{"origin":"operator_prepared","test":"FICTITIOUS_ROLLED_BACK"}}');
 state:=saved->'state';state:=state||'{"sec":10,"matchStarted":true,"running":false}';
 if not exists(select 1 from public.pilot_save_operator_state(target,1,state) where revision=2) then raise exception 'Clock state not saved';end if;
 if (select count(*) from public.pilot_events where match_id=target)<>2 then raise exception 'Unexpected official events';end if;
 perform set_config('ch360.preparation_result',jsonb_build_object('catalogue_home',home_count,'catalogue_away',away_count,'stable_player_retry',true,'stable_confirmation_retry',true,'blocked_before_confirmation',denied,'manual_goal_after_confirmation',true,'clock_revision',2,'temporary_players',10,'temporary_events',2,'rolled_back',true)::text,true);
end $$;
reset role;
select current_setting('ch360.preparation_result')::jsonb as transactional_smoke_result;
rollback;
