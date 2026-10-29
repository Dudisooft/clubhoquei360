// Rebuild only the captured application schema, without any production rows.
// Metadata stays in ignored private work/. Auth schema is created by real GoTrue.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {sql,work,root,secrets} from './integration-runtime.mjs';import {assertLocalStaging} from './integration-safety.mjs';
assertLocalStaging(secrets);
const file=path.join(root,'work/3a6/production-schema-private.json'),m=JSON.parse(fs.readFileSync(file));
const b=m.baseline,d=m.definitions,Q=s=>'"'+String(s).replaceAll('"','""')+'"',role=s=>s==='PUBLIC'||s==='public'?'PUBLIC':Q(s);
if(sql("select to_regclass('app_private.integration_baseline') is not null")==='t'){console.log('Captured predecessor already installed; no destructive reinitialization.');process.exit(0);}
if(sql("select to_regclass('public.teams') is not null")==='t')throw Error('Refusing to overwrite an existing business schema.');
const parts=['begin;set local check_function_bodies=false;set local search_path=public,extensions;create schema app_private;'];
for(const t of b.tables){const columns=b.columns.filter(c=>c.table===t.table).map(c=>Q(c.column)+' '+(c.udt.startsWith('_')?Q(c.udt.slice(1))+'[]':Q(c.udt))+(c.default?' default '+c.default:'')+(c.nullable==='NO'?' not null':''));parts.push('create table public.'+Q(t.table)+'('+columns.join(',')+');');}
for(const f of d.functions)parts.push(f.definition+';');
for(const c of [...b.constraints.filter(c=>!c.definition.startsWith('FOREIGN KEY')),...b.constraints.filter(c=>c.definition.startsWith('FOREIGN KEY'))])parts.push('alter table public.'+Q(c.table.replace(/^public\./,''))+' add constraint '+Q(c.name)+' '+c.definition+';');
const constraintNames=new Set(b.constraints.map(c=>c.name));for(const i of d.indexes||[])if(!constraintNames.has(i.indexname))parts.push(i.indexdef+';');
for(const t of b.tables)if(t.rls)parts.push('alter table public.'+Q(t.table)+' enable row level security;');
for(const p of b.policies)parts.push('create policy '+Q(p.policyname)+' on public.'+Q(p.tablename)+' as '+p.permissive+' for '+p.cmd+' to '+p.roles.map(role).join(',')+(p.qual?' using ('+p.qual+')':'')+(p.with_check?' with check ('+p.with_check+')':'')+';');
for(const t of b.triggers||[])parts.push(t.definition+';');
for(const f of d.functions){const ref=Q(f.schema)+'.'+Q(f.name)+'('+f.args+')';parts.push('revoke all on function '+ref+' from public,anon,authenticated,service_role;');const acl=f.acl==null?['=X/postgres']:f.acl.slice(1,-1).split(',');for(const a of acl){const who=a.split('=')[0].replaceAll('"','');if(who==='postgres')continue;if(!['','anon','authenticated','service_role'].includes(who))throw Error('Unexpected function ACL role; review required');if(a.split('=')[1]?.startsWith('X'))parts.push('grant execute on function '+ref+' to '+(who?role(who):'PUBLIC')+';');}}
for(const g of m.grants||[])parts.push('grant '+g.privilege+' on public.'+Q(g.table)+' to '+role(g.grantee)+';');
for(const g of m.column_grants||[])parts.push('grant '+g.privilege+'('+Q(g.column)+') on public.'+Q(g.table)+' to '+role(g.grantee)+';');
for(const g of m.schema_grants||[])if(['PUBLIC','anon','authenticated','service_role'].includes(g.grantee))parts.push('grant '+g.privilege_type+' on schema '+Q(g.nspname)+' to '+role(g.grantee)+';');
parts.push('create table app_private.integration_baseline(project_id text primary key,schema_sha256 text not null);');parts.push("insert into app_private.integration_baseline values('"+secrets.projectId+"','"+crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')+"');commit;");
const generated=path.join(root,'work/3a6/reconstructed-schema-private.sql');fs.writeFileSync(generated,parts.join('\n'),{mode:0o600});sql(parts.join('\n'));
console.log('Captured public/app_private schema reconstructed locally without production records.');
