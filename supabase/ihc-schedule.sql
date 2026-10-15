-- One competition per hour: 21 competition refreshes per cycle; FEM15 retains its existing importer.
select cron.schedule('ihc-federation-hourly','17 * * * *',$job$
 select net.http_post(
  url:='https://oevprbchlhyglhvopnvy.supabase.co/functions/v1/ihc-sync',
  headers:=jsonb_build_object('Content-Type','application/json','x-federation-scheduler',(select decrypted_secret from vault.decrypted_secrets where name='federation_sync_scheduler')),
  body:='{"action":"next"}'::jsonb,timeout_milliseconds:=120000
 );
$job$);
