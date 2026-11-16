begin;
revoke select, insert on public.federation_match_events from service_role;
commit;
