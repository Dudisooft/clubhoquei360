# Read saved read-only evidence; never connects to a database.
import json,hashlib,pathlib
p=pathlib.Path(__file__).resolve().parent.parent; inv=json.loads((p/'ops/truncate-3a8/inventory.json').read_text()); pf=json.loads((p/'docs/evidence/phase-3a9-preflight.json').read_text()); audit=json.loads((p/'docs/evidence/phase-3a9-roles.json').read_text()); detail=json.loads((p/'docs/evidence/phase-3a9-inspection.json').read_text())
def canon(ds): return sorted(json.dumps(x,sort_keys=True) for x in ds)
actual=[dict(owner=x['owner'],schema=x['schema'],grantable=x['is_grantable'],privilege=x['privilege_type'],beneficiary=x['beneficiary']) for x in detail['defaults']]
assert canon(actual)==canon(inv['defaults'])
assert pf['actual']==49 and pf['unexpected']==pf['missing']==pf['wrong_or_missing_objects']==0
assert len({x['table_name'] for x in pf['cases']})==27
assert all(x['rls'] and x['effective_truncate'] and x['actual_owner']=='postgres' for x in pf['cases'])
roles={r['rolname']:r for r in audit['roles']}
assert not roles['postgres']['rolsuper']
for name in ['anon','authenticated']:
 assert not roles[name]['rolcanlogin'] and not roles[name]['rolsuper'] and not roles[name]['rolbypassrls']
 assert not any(m['member']==name for m in audit['memberships'])
assert all(not x['owner_entry'] and x['explicit_object_acl'] and not x['owner_membership'] and not x['is_grantable'] for x in audit['inventory'])
m=json.loads((p/'ops/truncate-3a8/MANIFEST.json').read_text())
for f in m['files']: assert hashlib.sha256((p/'ops/truncate-3a8'/f['path']).read_bytes()).hexdigest()==f['sha256']
result={'date':'2026-10-30','result':'PASS_READ_ONLY_PREFLIGHT','explicit_grants':49,'tables':27,'default_entries':20,'client_truncate_defaults':2,'tuple_differences':0,'defaults_differences':0,'owner':'postgres','executor':'postgres NOSUPERUSER','client_elevated_memberships':False,'all_target_rls':True,'correction_applied':False,'production_mutations':0,'package_manifest_verified':True,'caveat':'Actual execution still requires separate authorization, fresh preflight and recoverable production backup; no mutation used to prove capability.'}
(p/'docs/evidence/phase-3a9-security-comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
