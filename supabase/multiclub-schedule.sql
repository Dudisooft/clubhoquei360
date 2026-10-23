-- Install only after approval, source access verification and Edge deployment.
-- pg_cron + pg_net + the existing Vault token are required. One job per minute,
-- at most three source requests per invocation, and per-source cooldowns apply.
begin;
select cron.schedule('multiclub-federation-worker','* * * * *',$job$
 select net.http_post(url:='https://oevprbchlhyglhvopnvy.supabase.co/functions/v1/club-sync',
 headers:=jsonb_build_object('Content-Type','application/json','x-federation-scheduler',(select decrypted_secret from vault.decrypted_secrets where name='federation_sync_scheduler')),
 body:='{}'::jsonb,timeout_milliseconds:=90000);
$job$);
select cron.alter_job((select jobid from cron.job where jobname='multiclub-federation-worker'),active:=false);
-- Do not activate this alongside ihc-federation-hourly for the same sources.

commit;
