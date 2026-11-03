// Node verification wrapper over the same adapter used by the Edge Function.
import fs from 'node:fs';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import ts from 'typescript';
const require=createRequire(import.meta.url);
const moduleUrl=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpile(s,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022})).toString('base64');
const linkedom=pathToFileURL(require.resolve('linkedom')).href;
const parser=moduleUrl(fs.readFileSync(new URL('../../supabase/functions/federation-sync/parser.ts',import.meta.url),'utf8').replace('npm:linkedom@0.18.12',linkedom));
const api=await import(moduleUrl(fs.readFileSync(new URL('../../supabase/functions/federation-sync/public-api.ts',import.meta.url),'utf8').replace('npm:linkedom@0.18.12',linkedom).replace('./parser.ts',parser)));
export const {PORTALS,normalizeCalendar,normalizeReport,importLegacyCalendar,PublicFederation,readRfepSnapshot,canonicalRfepReport}=api;
