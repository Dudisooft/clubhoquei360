-- Unattended reuse is disabled until RFEP/FECAPA usage permission is confirmed.
select cron.schedule('clubhoquei360-federation-6h','15 */6 * * *',$job$
 select net.http_post(url:='https://oevprbchlhyglhvopnvy.supabase.co/functions/v1/federation-sync',
 headers:=jsonb_build_object('Content-Type','application/json','x-federation-scheduler',(select decrypted_secret from vault.decrypted_secrets where name='federation_sync_scheduler')),
 body:='{}'::jsonb,timeout_milliseconds:=120000);
$job$);
select cron.alter_job((select jobid from cron.job where jobname='clubhoquei360-federation-6h'),active:=false);
update public.federation_match_sources set automatic_enabled=false;
