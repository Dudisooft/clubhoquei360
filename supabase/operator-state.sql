create table if not exists public.pilot_operator_state (
 match_id uuid primary key references public.pilot_matches(id), revision bigint not null default 0,
 state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);
alter table public.pilot_operator_state enable row level security;
create policy operator_state_member_read on public.pilot_operator_state for select to authenticated
 using(exists(select 1 from public.pilot_members m where m.match_id=pilot_operator_state.match_id and m.user_id=(select auth.uid())));
create policy operator_state_operator_insert on public.pilot_operator_state for insert to authenticated
 with check(updated_by=(select auth.uid()) and exists(select 1 from public.pilot_members m where m.match_id=pilot_operator_state.match_id and m.user_id=(select auth.uid()) and m.role='operator'));
create policy operator_state_operator_update on public.pilot_operator_state for update to authenticated
 using(exists(select 1 from public.pilot_members m where m.match_id=pilot_operator_state.match_id and m.user_id=(select auth.uid()) and m.role='operator'))
 with check(updated_by=(select auth.uid()) and exists(select 1 from public.pilot_members m where m.match_id=pilot_operator_state.match_id and m.user_id=(select auth.uid()) and m.role='operator'));
grant select,insert,update on public.pilot_operator_state to authenticated;
create or replace function public.pilot_save_operator_state(p_match uuid,p_revision bigint,p_state jsonb)
returns setof public.pilot_operator_state language plpgsql security invoker set search_path='' as $$ begin
 if p_revision=0 then
 insert into public.pilot_operator_state(match_id,revision,state,updated_by) values(p_match,1,p_state,auth.uid()) on conflict(match_id) do nothing;
 return query select * from public.pilot_operator_state where match_id=p_match and revision=1 and updated_by=auth.uid() and state=p_state;
 else
 return query update public.pilot_operator_state set revision=revision+1,state=p_state,updated_by=auth.uid(),updated_at=now() where match_id=p_match and revision=p_revision returning *;
 end if; end $$;
revoke all on function public.pilot_save_operator_state(uuid,bigint,jsonb) from public,anon;
grant execute on function public.pilot_save_operator_state(uuid,bigint,jsonb) to authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='pilot_operator_state') then alter publication supabase_realtime add table public.pilot_operator_state; end if; end $$;
