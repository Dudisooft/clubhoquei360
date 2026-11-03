-- REVIEW ONLY, not a production migration. Requires PR #31 age_group columns.
-- User-reported participation, not inspected images; catalogue IDs checked 3A.4.
-- No administrative classification is approved. All six UPDATE statements disabled.
begin;
create temporary table senior_review_3a5(id uuid primary key,club_id uuid,season_id uuid,category text,federation text,competition_id text,external_team_id text) on commit drop;
insert into senior_review_3a5 values
('666ba825-830b-4136-b3da-2cb7c5f5ae14','a48efe2f-c218-633e-6be6-4ce26e61f5cd','94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e','TERCERA CATALANA MASCULINA','FECAPA','4781','12080'),
('ad2bbfdd-9b11-c0e2-b335-a0b60b6c68ab','a48efe2f-c218-633e-6be6-4ce26e61f5cd','94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e','SEGONA CATALANA MASCULINA','FECAPA','4779','12078'),
('c31eddb5-389e-9487-544d-6bd974e2869b','a48efe2f-c218-633e-6be6-4ce26e61f5cd','94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e','NACIONAL CATALANA MASCULINA','FECAPA','4774','12077'),
('c7b496b0-2d68-d6ae-5f80-70928f35e903','a48efe2f-c218-633e-6be6-4ce26e61f5cd','94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e','SÈNIOR · primer equip','RFEP','3568','3696'),
('f46aafd6-0ccb-a3df-14ed-5abafb4109d3','a48efe2f-c218-633e-6be6-4ce26e61f5cd','94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e','TERCERA CATALANA MASCULINA','FECAPA','4781','12079'),
('f9eed270-6221-42dc-7ac4-3df490ad65db','a48efe2f-c218-633e-6be6-4ce26e61f5cd','94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e','OK LIGA','RFEP','3575','3697');
-- Cardinality/identity preflight: no lookup by team/sponsor name.
do $$declare p record; n int;begin
 for p in select * from senior_review_3a5 loop
  select count(*) into n from public.teams t join public.seasons s on s.id=t.season_id
  where t.id=p.id and t.club_id=p.club_id and t.season_id=p.season_id and t.category=p.category and s.club_id=p.club_id and s.label='2026/27';
  if n<>1 then raise exception 'Team cardinality/scope mismatch: %',p.id;end if;
  select count(*) into n from public.federation_team_entries e join public.federation_competitions c on c.id=e.competition_id
  where e.club_team_id=p.id and c.club_id=p.club_id and c.season_id=p.season_id and c.federation=p.federation and c.external_competition_id=p.competition_id and e.external_team_id=p.external_team_id;
  if n<>1 then raise exception 'Entry cardinality/scope mismatch: %',p.id;end if;
 end loop;
end$$;
-- Inspect before future administrative approval; never automatically apply.
select p.*,t.age_group current_age_group from senior_review_3a5 p join public.teams t on t.id=p.id order by p.id;
-- DISABLED until independent administrative approval; evidence: docs/SENIOR_CLASSIFICATIONS_3A5.md
-- UPDATE public.teams SET age_group='senior',age_group_source='3A.5 user-reported participation + catalogue identity; requires separate administrative approval' WHERE id='666ba825-830b-4136-b3da-2cb7c5f5ae14' AND club_id='a48efe2f-c218-633e-6be6-4ce26e61f5cd' AND season_id='94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e' AND category='TERCERA CATALANA MASCULINA' AND age_group IS NULL;
-- DISABLED until independent administrative approval; evidence: docs/SENIOR_CLASSIFICATIONS_3A5.md
-- UPDATE public.teams SET age_group='senior',age_group_source='3A.5 user-reported participation + catalogue identity; requires separate administrative approval' WHERE id='ad2bbfdd-9b11-c0e2-b335-a0b60b6c68ab' AND club_id='a48efe2f-c218-633e-6be6-4ce26e61f5cd' AND season_id='94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e' AND category='SEGONA CATALANA MASCULINA' AND age_group IS NULL;
-- DISABLED until independent administrative approval; evidence: docs/SENIOR_CLASSIFICATIONS_3A5.md
-- UPDATE public.teams SET age_group='senior',age_group_source='3A.5 user-reported participation + catalogue identity; requires separate administrative approval' WHERE id='c31eddb5-389e-9487-544d-6bd974e2869b' AND club_id='a48efe2f-c218-633e-6be6-4ce26e61f5cd' AND season_id='94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e' AND category='NACIONAL CATALANA MASCULINA' AND age_group IS NULL;
-- DISABLED until independent administrative approval; evidence: docs/SENIOR_CLASSIFICATIONS_3A5.md
-- UPDATE public.teams SET age_group='senior',age_group_source='3A.5 user-reported participation + catalogue identity; requires separate administrative approval' WHERE id='c7b496b0-2d68-d6ae-5f80-70928f35e903' AND club_id='a48efe2f-c218-633e-6be6-4ce26e61f5cd' AND season_id='94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e' AND category='SÈNIOR · primer equip' AND age_group IS NULL;
-- DISABLED until independent administrative approval; evidence: docs/SENIOR_CLASSIFICATIONS_3A5.md
-- UPDATE public.teams SET age_group='senior',age_group_source='3A.5 user-reported participation + catalogue identity; requires separate administrative approval' WHERE id='f46aafd6-0ccb-a3df-14ed-5abafb4109d3' AND club_id='a48efe2f-c218-633e-6be6-4ce26e61f5cd' AND season_id='94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e' AND category='TERCERA CATALANA MASCULINA' AND age_group IS NULL;
-- DISABLED until independent administrative approval; evidence: docs/SENIOR_CLASSIFICATIONS_3A5.md
-- UPDATE public.teams SET age_group='senior',age_group_source='3A.5 user-reported participation + catalogue identity; requires separate administrative approval' WHERE id='f9eed270-6221-42dc-7ac4-3df490ad65db' AND club_id='a48efe2f-c218-633e-6be6-4ce26e61f5cd' AND season_id='94b6c5ab-ecc9-b4a5-4a2a-ad8d5446ff2e' AND category='OK LIGA' AND age_group IS NULL;
rollback;
